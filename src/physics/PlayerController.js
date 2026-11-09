// 키 입력 → 토크/힘. 담당: 원유승
// STUB: W/S = heading에 수직인 축으로 구름 토크, A/D = 측면 힘. 튜닝 전 값.
import * as CANNON from 'cannon-es';

const ROLL_TORQUE = 6;
const SIDE_FORCE = 4;
const MAX_SPEED = 12; // 터널링 방지용 속도 제한

/**
 * @param {CANNON.Body} body
 * @param {import('../shared/contracts.js').Input} input
 * @param {import('../shared/contracts.js').Heading} heading
 */
export function applyControls(body, input, heading) {
  // heading (x, z)에 대해 오른쪽 벡터 = (-z, x). 앞으로 구르려면 오른쪽 축 기준 음의 회전.
  const right = new CANNON.Vec3(-heading.z, 0, heading.x);
  const roll = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
  const side = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  if (roll) body.applyTorque(right.scale(-ROLL_TORQUE * roll));
  if (side) body.applyForce(right.scale(SIDE_FORCE * side));

  const v = body.velocity;
  const speed = v.length();
  if (speed > MAX_SPEED) v.scale(MAX_SPEED / speed, v);
}
