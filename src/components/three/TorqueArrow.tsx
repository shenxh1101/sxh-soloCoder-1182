import { useMemo } from 'react';
import * as THREE from 'three';
import type { SceneComponent } from '../../types';
import { ComponentType } from '../../types';

interface TorqueArrowProps {
  component: SceneComponent;
}

export function TorqueArrow({ component }: TorqueArrowProps) {
  const direction = (component as any).direction as 1 | -1;
  const speed = (component as any).currentSpeed as number;

  if (component.type === ComponentType.SHAFT || speed === 0 || !direction) return null;

  const radius = (component as any).radius || 1;
  const arrowColor = direction === 1 ? '#22c55e' : '#f97316';

  const arcPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 32;
    const startAngle = direction === 1 ? 0 : Math.PI;
    const arcLength = Math.PI * 1.2;

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (i / segments) * arcLength * direction;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * (radius + 0.3),
          0.5,
          Math.sin(angle) * (radius + 0.3)
        )
      );
    }
    return points;
  }, [radius, direction]);

  const lineGeometry = useMemo(() => {
    const positions = new Float32Array(arcPoints.length * 3);
    arcPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [arcPoints]);

  const arrowPosition = useMemo(() => {
    const lastPoint = arcPoints[arcPoints.length - 1];
    const prevPoint = arcPoints[arcPoints.length - 2];
    const tangent = new THREE.Vector3()
      .subVectors(lastPoint, prevPoint)
      .normalize();
    return {
      pos: new THREE.Vector3(
        lastPoint.x + component.position.x,
        lastPoint.y + component.position.y,
        lastPoint.z + component.position.z
      ),
      rot: Math.atan2(tangent.z, tangent.x),
    };
  }, [arcPoints, component.position]);

  return (
    <group position={[component.position.x, component.position.y, component.position.z]}>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color={arrowColor} linewidth={3} transparent opacity={0.8} />
      </lineSegments>

      <mesh
        position={[arrowPosition.pos.x - component.position.x, arrowPosition.pos.y - component.position.y, arrowPosition.pos.z - component.position.z]}
        rotation={[0, -arrowPosition.rot + Math.PI / 2, 0]}
      >
        <coneGeometry args={[0.1, 0.25, 8]} />
        <meshBasicMaterial color={arrowColor} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}
