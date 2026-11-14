// 고정 상자(메쉬 + 충돌 상자) 만들기. 트랙과 장애물이 같이 쓴다. 담당: 손연우
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _up = new THREE.Vector3();

/**
 * 고정 상자 묶음. add()로 만들고 dispose()로 한 번에 지운다.
 *
 * 상자들은 질량 0 강체 하나에 shape로 붙인다. 상자마다 강체를 따로 만들면 (트랙만 80여 개)
 * cannon-es SAPBroadphase가 빠르게 들어오는 플레이어와의 충돌 쌍을 놓쳤다
 * (분할 레일에 구가 2m/s 이상으로 진입하면 레일을 그대로 통과해 낙하.
 *  NaiveBroadphase로 바꾸거나 강체 하나로 묶으면 정상).
 * @param {{ scene: THREE.Scene, world: CANNON.World }} ctx
 */
export function createBoxSet({ scene, world }) {
  const meshes = [];
  const body = new CANNON.Body({ mass: 0 }); // 월드 원점, 회전 없음. 상자는 shape offset으로 놓는다.
  world.addBody(body);

  return {
    body,
    /**
     * 윗면 중앙이 (x, top, z)이고 dir(XZ 단위벡터) 방향으로 length만큼 뻗은 상자.
     * pitch(rad) > 0이면 앞(dir 쪽)이 올라가게 기운다 (오르막 바닥). 윗면 중앙은 그대로 (x, top, z).
     * solid = false면 메쉬만 (충돌 없음, 장식용). hidden = true면 충돌만 (보이지 않는 벽)
     * @param {{ x: number, z: number, top: number, dir: {x:number,z:number},
     *           length: number, width: number, height: number, pitch?: number,
     *           material?: THREE.Material, castShadow?: boolean, solid?: boolean, hidden?: boolean }} b
     */
    add({
      x,
      z,
      top,
      dir,
      length,
      width,
      height,
      pitch = 0,
      material,
      castShadow = false,
      solid = true,
      hidden = false,
    }) {
      const yaw = Math.atan2(-dir.x, -dir.z); // 로컬 -Z → dir
      _q.setFromEuler(_e.set(pitch, yaw, 0, 'YXZ'));
      _up.set(0, 1, 0).applyQuaternion(_q);
      const cx = x - (_up.x * height) / 2;
      const cy = top - (_up.y * height) / 2;
      const cz = z - (_up.z * height) / 2;

      let mesh = null;
      if (!hidden) {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), material);
        mesh.position.set(cx, cy, cz);
        mesh.quaternion.copy(_q);
        mesh.receiveShadow = true;
        mesh.castShadow = castShadow;
        scene.add(mesh);
        meshes.push(mesh);
      }

      if (solid) {
        body.addShape(
          new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, length / 2)),
          new CANNON.Vec3(cx, cy, cz),
          new CANNON.Quaternion(_q.x, _q.y, _q.z, _q.w),
        );
      }
      return mesh;
    },
    dispose() {
      meshes.forEach((m) => {
        scene.remove(m);
        m.geometry.dispose();
      });
      meshes.length = 0;
      world.removeBody(body);
    },
  };
}
