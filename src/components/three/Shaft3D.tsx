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
  const handleShaftClick = useSceneStore((s) => s.handleShaftEditClick);
  const components = useSceneStore((s) => s.components);
  const pendingShaftSelection = useSceneStore((s) => s.pendingShaftSelection);

  const mountedCount = components.filter(
    (c) => c.id !== component.id && (c as any).mountedOnShaftId === component.id
  ).length;
  const isShaftEditTarget = connectionEditMode === 'shaft' && pendingShaftSelection !== null && pendingShaftSelection !== component.id;

  let color = '#94a3b8';
  let emissive = '#000000';
  let emissiveIntensity = 0;

  if (isShaftEditTarget) {
    color = '#22d3ee';
    emissive = '#06b6d4';
    emissiveIntensity = 0.5;
  } else if (isFocused) {
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
  } else if (mountedCount > 0) {
    color = '#64748b';
    emissive = '#0891b2';
    emissiveIntensity = 0.08;
  }

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (connectionEditMode === 'belt') return;
    if (connectionEditMode === 'shaft') {
      handleShaftClick(component.id);
      return;
    }
    selectComponent(component.id);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    if (connectionEditMode === 'shaft') {
      document.body.style.cursor = isShaftEditTarget ? 'copy' : 'pointer';
    } else {
      document.body.style.cursor = 'pointer';
    }
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

      {(isSelected || isHighlighted || isFocused || isShaftEditTarget) && (
        <mesh>
          <cylinderGeometry
            args={[component.radius + 0.05, component.radius + 0.05, component.length + 0.02, 32]}
          />
          <meshBasicMaterial
            color={isShaftEditTarget ? '#22d3ee' : isFocused ? '#fbbf24' : isHighlighted ? '#f97316' : '#3b82f6'}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {mountedCount > 0 && (
        <mesh>
          <cylinderGeometry
            args={[component.radius + 0.03, component.radius + 0.03, component.length, 32]}
          />
          <meshBasicMaterial
            color="#06b6d4"
            transparent
            opacity={0.15}
          />
        </mesh>
      )}
    </group>
  );
}
