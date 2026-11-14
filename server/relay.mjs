// 멀티 플레이 중계 서버 (외부 패키지 없음, Node 기본 http + 직접 구현한 WebSocket). 담당: 원유승
// 실행: npm run server  (기본 포트 8787, PORT 환경 변수로 바꿈)
//
// 하는 일: 방(4글자 코드) 관리, 방 안 사람들끼리 메시지 중계, 완주 순위 정리. 물리는 각 브라우저가 계산한다.
// 메시지는 JSON 텍스트 한 줄. t = 종류.
//   클라 → 서버
//     { t: 'create', name, animal, legs }       방 만들기 (만든 사람이 방장)
//     { t: 'join', room, name, animal, legs }   방 코드로 참가
//     { t: 'look', animal, legs }               대기 화면에서 동물 · 다리를 바꿈 (레이스 중 다리 교체도)
//     { t: 'start' }                            방장만: 다 같이 출발
//     { t: 'state', p: [x, y, z], yaw, leg, prog }  레이스 중 내 상태 (초당 15번 정도, prog = 출발부터 간 거리)
//     { t: 'finish', time }                     완주
//   서버 → 클라
//     { t: 'joined', room, id }                 들어감 (내 id)
//     { t: 'error', message }
//     { t: 'room', room, host, started, players: [{ id, name, animal, legs }] }  참가자 · 방장이 바뀔 때마다
//     { t: 'start' }                            출발 (모두 같이 카운트다운 시작)
//     { t: 'state', id, ... }                   다른 사람 상태 (그대로 중계)
//     { t: 'results', list: [{ id, name, time }] }  완주 순서
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8787);
const MAX_PLAYERS = 6;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 헷갈리는 I · O 제외
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// ── WebSocket (RFC 6455 중 텍스트 · 닫기 · 핑만) ────────────────────

/** 서버가 보내는 프레임 (마스크 없음) */
function frame(opcode, payload) {
  const len = payload.length;
  let head;
  if (len < 126) head = Buffer.from([0x80 | opcode, len]);
  else if (len < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x80 | opcode;
    head[1] = 126;
    head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x80 | opcode;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([head, payload]);
}

/**
 * 소켓 하나를 WebSocket 연결로 감싼다.
 * @returns {{ send(obj: object): void, close(): void, onMessage: (obj) => void, onClose: () => void }}
 */
function wrap(socket) {
  const conn = { onMessage: () => {}, onClose: () => {}, closed: false };
  let buf = Buffer.alloc(0);
  let parts = []; // 조각난 메시지 (FIN = 0)

  conn.send = (obj) => {
    if (conn.closed) return;
    socket.write(frame(0x1, Buffer.from(JSON.stringify(obj))));
  };
  conn.close = () => {
    if (conn.closed) return;
    conn.closed = true;
    try {
      socket.end(frame(0x8, Buffer.alloc(0)));
    } catch {
      // 이미 닫힘
    }
    conn.onClose();
  };

  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const fin = (buf[0] & 0x80) !== 0;
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        off = 10;
      }
      const maskOff = off;
      if (masked) off += 4;
      if (buf.length < off + len) return; // 아직 다 안 옴
      const data = Buffer.from(buf.subarray(off, off + len));
      if (masked) for (let i = 0; i < len; i++) data[i] ^= buf[maskOff + (i % 4)];
      buf = buf.subarray(off + len);

      if (opcode === 0x8) return conn.close();
      if (opcode === 0x9) {
        socket.write(frame(0xa, data)); // ping → pong
        continue;
      }
      if (opcode === 0x1 || opcode === 0x0) {
        parts.push(data);
        if (!fin) continue;
        const text = Buffer.concat(parts).toString('utf8');
        parts = [];
        try {
          conn.onMessage(JSON.parse(text));
        } catch {
          // JSON이 아니면 무시
        }
      }
    }
  });
  socket.on('close', () => {
    if (!conn.closed) {
      conn.closed = true;
      conn.onClose();
    }
  });
  socket.on('error', () => socket.destroy());
  return conn;
}

// ── 방 ────────────────────────────────────────────────────────────

/** @type {Map<string, { code: string, host: number, started: boolean, startAt: number, players: Map<number, any>, results: any[] }>} */
const rooms = new Map();
let nextId = 1;

function newCode() {
  for (;;) {
    const code = Array.from(
      { length: 4 },
      () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    ).join('');
    if (!rooms.has(code)) return code;
  }
}

function roomInfo(room) {
  return {
    t: 'room',
    room: room.code,
    host: room.host,
    started: room.started,
    players: [...room.players.values()].map(({ id, name, animal, legs }) => ({
      id,
      name,
      animal,
      legs,
    })),
  };
}
const broadcast = (room, msg, exceptId) => {
  for (const p of room.players.values()) if (p.id !== exceptId) p.conn.send(msg);
};

const cleanName = (n) =>
  String(n ?? '')
    .trim()
    .slice(0, 12) || '플레이어';
const cleanLegs = (legs) =>
  Array.isArray(legs)
    ? legs.slice(0, 400).map((p) => ({ x: Number(p?.x) || 0, y: Number(p?.y) || 0 }))
    : [];

function handle(conn, player, msg) {
  const room = player.room && rooms.get(player.room);
  switch (msg?.t) {
    case 'create':
    case 'join': {
      if (room) return;
      let target;
      if (msg.t === 'create') {
        target = {
          code: newCode(),
          host: player.id,
          started: false,
          startAt: 0,
          players: new Map(),
          results: [],
        };
        rooms.set(target.code, target);
      } else {
        target = rooms.get(String(msg.room ?? '').toUpperCase());
        if (!target) return conn.send({ t: 'error', message: '그런 방이 없어요' });
        if (target.started)
          return conn.send({ t: 'error', message: '이미 레이스가 시작된 방이에요' });
        if (target.players.size >= MAX_PLAYERS)
          return conn.send({ t: 'error', message: '방이 꽉 찼어요' });
      }
      Object.assign(player, {
        room: target.code,
        name: cleanName(msg.name),
        animal: String(msg.animal ?? 'cat'),
        legs: cleanLegs(msg.legs),
      });
      target.players.set(player.id, player);
      conn.send({ t: 'joined', room: target.code, id: player.id });
      broadcast(target, roomInfo(target));
      return;
    }
    case 'look': {
      if (!room) return;
      if (msg.animal) player.animal = String(msg.animal);
      if (msg.legs) player.legs = cleanLegs(msg.legs);
      broadcast(room, roomInfo(room));
      return;
    }
    case 'start': {
      if (!room || room.host !== player.id) return;
      room.started = true;
      room.results = [];
      for (const p of room.players.values()) p.finished = false;
      broadcast(room, { t: 'start' });
      broadcast(room, roomInfo(room));
      return;
    }
    case 'state': {
      if (!room) return;
      broadcast(
        room,
        { t: 'state', id: player.id, p: msg.p, yaw: msg.yaw, leg: msg.leg, prog: msg.prog },
        player.id,
      );
      return;
    }
    case 'finish': {
      if (!room || player.finished) return;
      player.finished = true;
      room.results.push({ id: player.id, name: player.name, time: Number(msg.time) || 0 });
      broadcast(room, { t: 'results', list: room.results });
      // 모두 완주하면 다시 대기 상태로 (같은 방에서 한 판 더)
      if ([...room.players.values()].every((p) => p.finished)) {
        room.started = false;
        broadcast(room, roomInfo(room));
      }
      return;
    }
  }
}

function leave(player) {
  const room = player.room && rooms.get(player.room);
  if (!room) return;
  room.players.delete(player.id);
  if (!room.players.size) {
    rooms.delete(room.code);
    return;
  }
  if (room.host === player.id) room.host = room.players.keys().next().value; // 다음 사람이 방장
  if (room.started && [...room.players.values()].every((p) => p.finished)) room.started = false;
  broadcast(room, roomInfo(room));
}

// ── HTTP 서버 + 업그레이드 ───────────────────────────────────────

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(`RollCraft relay · 방 ${rooms.size}개\n`);
});

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || req.headers.upgrade?.toLowerCase() !== 'websocket') return socket.destroy();
  const accept = crypto
    .createHash('sha1')
    .update(key + GUID)
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  socket.setNoDelay(true);
  const conn = wrap(socket);
  const player = { id: nextId++, conn, room: null };
  conn.onMessage = (msg) => handle(conn, player, msg);
  conn.onClose = () => leave(player);
});

server.listen(PORT, () => {
  console.log(`RollCraft relay: ws://localhost:${PORT}`);
});
