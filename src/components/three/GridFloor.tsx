import { useMemo } from 'react';
import * as THREE from 'three';
import type { BackgroundType } from '../../types';

interface GridFloorProps {
  background: BackgroundType;
  size?: number;
  divisions?: number;
}

export function GridFloor({ background, size = 40, divisions = 40 }: GridFloorProps) {
  const gridColor = useMemo(() => {
    switch (background) {
      case 'blueprint':
        return '#2a4a6b';
      case 'transparent':
        return '#64748b';
      default:
        return '#475569';
    }
  }, [background]);

  const centerLineColor = useMemo(() => {
    switch (background) {
      case 'blueprint':
        return '#1a365d';
      default:
        return '#64748b';
    }
  }, [background]);

  return (
    <group>
      <gridHelper
        args={[size, divisions, gridColor, gridColor]}
        position={[0, 0, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color={background === 'blueprint' ? '#f0f4f8' : background === 'transparent' ? '#0f172a' : '#1e293b'}
          transparent={background === 'transparent'}
          opacity={background === 'transparent' ? 0.3 : 0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group position={[0, 0.01, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[size, 0.02]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[size, 0.02]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      </group>

      <group position={[size / 2 - 0.3, 0.02, 0]}>
        <mesh>
          <coneGeometry args={[0.15, 0.4, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>
      <group position={[0, 0.02, size / 2 - 0.3]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <coneGeometry args={[0.15, 0.4, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      </group>
      <group position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <coneGeometry args={[0.15, 0.4, 8]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      </group>
    </group>
  );
}
