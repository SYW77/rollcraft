// 멀티 플레이: 중계 서버(server/relay.mjs) 연결. 담당: 원유승
// 메시지 형식은 server/relay.mjs 머리 주석 참고.
// 서버 주소
// - 개발(npm run dev, 포트 5173): 같은 컴퓨터의 8787 포트 (npm run server)
// - 배포(npm start가 게임 파일도 보냄): 지금 페이지와 같은 주소
// - 주소창에 ?server=ws://... 를 붙이면 그 주소

const DEV_PORT = '5173';
const RELAY_PORT = 8787;

export function relayUrl() {
  const q = new URLSearchParams(location.search).get('server');
  if (q) return q;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  if (location.port === DEV_PORT) return `${proto}://${location.hostname}:${RELAY_PORT}`;
  return `${proto}://${location.host}`;
}

/**
 * @param {string} [url]
 * @returns {Promise<{ send(msg: object): void, on(type: string, fn: (msg: any) => void): void,
 *                     onClose(fn: () => void): void, close(): void }>}
 */
export function connectRelay(url = relayUrl()) {
  return new Promise((resolve, reject) => {
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      reject(e);
      return;
    }
    const handlers = new Map();
    let closeFn = () => {};
    let opened = false;
    const api = {
      send(msg) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      },
      on(type, fn) {
        handlers.set(type, fn);
      },
      onClose(fn) {
        closeFn = fn;
      },
      close() {
        closeFn = () => {};
        ws.close();
      },
    };
    ws.onopen = () => {
      opened = true;
      resolve(api);
    };
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      handlers.get(msg.t)?.(msg);
    };
    ws.onerror = () => {
      if (!opened) reject(new Error(`서버에 연결할 수 없어요 (${url})`));
    };
    ws.onclose = () => {
      if (opened) closeFn();
    };
  });
}
