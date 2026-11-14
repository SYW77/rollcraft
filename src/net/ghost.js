// 멀티 플레이: 다른 사람 플레이어 (보이기만, 충돌 없음). 담당: 원유승
// 받은 상태(위치 · 방향 · 다리 각도)로 부드럽게 따라간다. 머리 위에 이름표.
import * as THREE from 'three';
import { makeAnimal, makeLegs, legLine, disposeLook } from '../physics/climberLook.js';

const FOLLOW = 12; // 1/s. 받은 위치로 따라가는 빠르기 (클수록 딱 붙고, 작을수록 부드럽다)

function nameTag(name) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(19, 33, 63, 0.85)';
  g.fillRect(0, 8, 256, 48);
  g.font = 'italic 900 30px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffd23f';
  g.fillText(name, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(1.6, 0.4, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/**
 * @param {{ scene: THREE.Scene, name: string, animal: string, legs: import('../shared/contracts.js').Legs }} opts
 */
export function createGhost({ scene, name, animal, legs }) {
  const holder = new THREE.Group(); // 몸통 (요만 돈다)
  const legsHolder = new THREE.Group(); // 다리 (몸통 위치 + 다리 각도)
  const tag = nameTag(name);
  if (tag) scene.add(tag);
  scene.add(holder, legsHolder);
  let body = null;
  let legMesh = null;
  let reach = 0.5;
  let look = '';

  function setLook(a, l) {
    const key = JSON.stringify([a, l]);
    if (key === look) return;
    look = key;
    if (body) {
      holder.remove(body);
      disposeLook(body);
    }
    if (legMesh) {
      legsHolder.remove(legMesh);
      disposeLook(legMesh);
    }
    body = makeAnimal(a);
    const line = legLine(l);
    reach = Math.max(0.45, ...line.map(([z, y]) => Math.hypot(z, y)));
    legMesh = makeLegs(line);
    holder.add(body);
    legsHolder.add(legMesh);
  }
  setLook(animal, legs);

  const target = { p: new THREE.Vector3(), yaw: 0, leg: 0 };
  let have = false;
  let yaw = 0;
  let leg = 0;
  const yawQ = new THREE.Quaternion();
  const legQ = new THREE.Quaternion();
  const X = new THREE.Vector3(1, 0, 0);
  const Y = new THREE.Vector3(0, 1, 0);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  return {
    setLook,
    /** 서버에서 받은 상태 */
    setState({ p, yaw: y, leg: l }) {
      if (!Array.isArray(p)) return;
      target.p.set(p[0], p[1], p[2]);
      target.yaw = y ?? 0;
      target.leg = l ?? 0;
      if (!have) {
        have = true;
        holder.position.copy(target.p);
        yaw = target.yaw;
        leg = target.leg;
      }
    },
    update(dt) {
      if (!have) {
        holder.visible = legsHolder.visible = false;
        if (tag) tag.visible = false;
        return;
      }
      holder.visible = legsHolder.visible = true;
      const k = 1 - Math.exp(-FOLLOW * dt);
      holder.position.lerp(target.p, k);
      yaw += wrap(target.yaw - yaw) * k;
      leg += wrap(target.leg - leg) * k;
      yawQ.setFromAxisAngle(Y, yaw);
      holder.quaternion.copy(yawQ);
      legsHolder.position.copy(holder.position);
      legQ.setFromAxisAngle(X, leg);
      legsHolder.quaternion.copy(yawQ).multiply(legQ);
      if (tag) {
        tag.visible = true;
        tag.position.set(
          holder.position.x,
          holder.position.y + 1.1 + reach * 0.3,
          holder.position.z,
        );
      }
    },
    dispose() {
      scene.remove(holder, legsHolder);
      if (body) disposeLook(body);
      if (legMesh) disposeLook(legMesh);
      if (tag) {
        scene.remove(tag);
        tag.material.map.dispose();
        tag.material.dispose();
      }
    },
  };
}
