import { useRef } from 'react';
import * as THREE from 'three';
import type { ShaftComponent } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';

interface Shaft3DProps {
  component: ShaftComponent;
  isSelected: boolean;
  isHighlighted: boolean;
  isFocused: boolean;
}

export function Shaft3D({ component, isSelected, isHighlighted, isFocused }: Shaft3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectComponent = useSceneStore((s) => s.selectComponent);
  const connectionEditMode = useSceneStore((s) => s.connectionEditMode);

  let color = '#94a3b8';
  let emissive = '#000000';
  let emissiveIntensity = 0;

  if (isFocused) {
    color = '#fbbf24';
    emissive = '#d97706';
    emissiveIntensity = 0.3;
  } else if (isHighlighted) {
    color = '#f97316';
    emissive = '#ea580c';
    emissiveIntensity = 0.2;
  } else if (isSelected) {
    color = '#3b82f6';
    emissive = '#1d4ed8';
    emissiveIntensity = 0.2;
  }

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (connectionEditMode === 'belt') return;
    selectComponent(component.id);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[component.radius, component.radius, component.length, 32]}
        />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {(isSelected || isHighlighted || isFocused) && (
        <mesh>
          <cylinderGeometry
            args={[component.radius + 0.05, component.radius + 0.05, component.length + 0.02, 32]}
          />
          <meshBasicMaterial
            color={isFocused ? '#fbbf24' : isHighlighted ? '#f97316' : '#3b82f6'}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
