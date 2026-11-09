// 고정 상자(메쉬 + 충돌 상자) 만들기. 트랙과 장애물이 같이 쓴다. 담당: 손연우
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const Y_AXIS = new CANNON.Vec3(0, 1, 0);

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
     * @param {{ x: number, z: number, top: number, dir: {x:number,z:number},
     *           length: number, width: number, height: number,
     *           material: THREE.Material, castShadow?: boolean }} b
     */
    add({ x, z, top, dir, length, width, height, material, castShadow = false }) {
      const yaw = Math.atan2(-dir.x, -dir.z); // 로컬 -Z → dir
      const y = top - height / 2;

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), material);
      mesh.position.set(x, y, z);
      mesh.rotation.y = yaw;
      mesh.receiveShadow = true;
      mesh.castShadow = castShadow;
      scene.add(mesh);
      meshes.push(mesh);

      body.addShape(
        new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, length / 2)),
        new CANNON.Vec3(x, y, z),
        new CANNON.Quaternion().setFromAxisAngle(Y_AXIS, yaw),
      );
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
