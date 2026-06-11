import { useMemo } from 'react';
import * as THREE from 'three';
import type { BeltConnection, PulleyComponent, SceneComponent } from '../../types';
import { ComponentType } from '../../types';

interface Belt3DProps {
  connection: BeltConnection;
  components: SceneComponent[];
}

export function Belt3D({ connection, components }: Belt3DProps) {
  const geometry = useMemo(() => {
    const fromPulley = components.find((c) => c.id === connection.fromPulleyId) as PulleyComponent;
    const toPulley = components.find((c) => c.id === connection.toPulleyId) as PulleyComponent;

    if (!fromPulley || !toPulley) return null;

    const points: THREE.Vector3[] = [];
    const segments = 64;

    const from = new THREE.Vector3(fromPulley.position.x, fromPulley.position.y, fromPulley.position.z);
    const to = new THREE.Vector3(toPulley.position.x, toPulley.position.y, toPulley.position.z);
    const r1 = fromPulley.radius;
    const r2 = toPulley.radius;

    const direction = new THREE.Vector3().subVectors(to, from);
    const distance = direction.length();
    direction.normalize();

    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      if (t < 0.25) {
        const angle = -Math.PI / 2 + (t / 0.25) * Math.PI;
        points.push(
          new THREE.Vector3(
            from.x + Math.cos(angle) * r1 * direction.x + Math.sin(angle) * r1 * perpendicular.x,
            from.y,
            from.z + Math.cos(angle) * r1 * direction.z + Math.sin(angle) * r1 * perpendicular.z
          )
        );
      } else if (t < 0.5) {
        const localT = (t - 0.25) / 0.25;
        const start = new THREE.Vector3(
          from.x + perpendicular.x * r1,
          from.y,
          from.z + perpendicular.z * r1
        );
        const end = new THREE.Vector3(
          to.x + perpendicular.x * r2,
          to.y,
          to.z + perpendicular.z * r2
        );
        points.push(new THREE.Vector3().lerpVectors(start, end, localT));
      } else if (t < 0.75) {
        const angle = Math.PI / 2 + ((t - 0.5) / 0.25) * Math.PI;
        points.push(
          new THREE.Vector3(
            to.x + Math.cos(angle) * r2 * direction.x + Math.sin(angle) * r2 * perpendicular.x,
            to.y,
            to.z + Math.cos(angle) * r2 * direction.z + Math.sin(angle) * r2 * perpendicular.z
          )
        );
      } else {
        const localT = (t - 0.75) / 0.25;
        const start = new THREE.Vector3(
          to.x - perpendicular.x * r2,
          to.y,
          to.z - perpendicular.z * r2
        );
        const end = new THREE.Vector3(
          from.x - perpendicular.x * r1,
          from.y,
          from.z - perpendicular.z * r1
        );
        points.push(new THREE.Vector3().lerpVectors(start, end, localT));
      }
    }

    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, 128, 0.04, 8, true);
  }, [connection, components]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#1e293b"
        metalness={0.3}
        roughness={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
