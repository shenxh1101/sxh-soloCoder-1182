import { useRef } from 'react';
import * as THREE from 'three';
import type { ShaftComponent } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';

interface Shaft3DProps {
  component: ShaftComponent;
  isSelected: boolean;
  isHighlighted: boolean;
}

export function Shaft3D({ component, isSelected, isHighlighted }: Shaft3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectComponent = useSceneStore((s) => s.selectComponent);

  const color = isSelected ? '#3b82f6' : isHighlighted ? '#f97316' : '#94a3b8';
  const emissive = isSelected ? '#1e40af' : isHighlighted ? '#c2410c' : '#000000';

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectComponent(component.id);
  };

  return (
    <group
      position={[component.position.x, component.position.y, component.position.z]}
      rotation={[component.rotation.x, component.rotation.y, component.rotation.z]}
    >
      <mesh
        ref={meshRef}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[component.radius, component.radius, component.length, 32]}
        />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isSelected || isHighlighted ? 0.2 : 0}
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {(isSelected || isHighlighted) && (
        <mesh>
          <cylinderGeometry
            args={[component.radius + 0.05, component.radius + 0.05, component.length + 0.02, 32]}
          />
          <meshBasicMaterial
            color={isHighlighted ? '#f97316' : '#3b82f6'}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
