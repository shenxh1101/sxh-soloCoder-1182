import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GearComponent } from '../../types';
import { createGearGeometry } from '../../utils/geometry';
import { useSceneStore } from '../../store/useSceneStore';
import { getTransmissionChain } from '../../engine/TransmissionEngine';
import { ComponentType } from '../../types';

interface Gear3DProps {
  component: GearComponent;
  isSelected: boolean;
  isHighlighted: boolean;
  isFocused: boolean;
  isBeltEditTarget: boolean;
  isPendingBelt: boolean;
  showMeshPreview: boolean;
  isMountedOnShaft?: boolean;
  isShaftEditTarget?: boolean;
  isPendingShaft?: boolean;
}

export function Gear3D({ component, isSelected, isHighlighted, isFocused, isBeltEditTarget, isPendingBelt, showMeshPreview, isMountedOnShaft, isShaftEditTarget, isPendingShaft }: Gear3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isRunning = useSceneStore((s) => s.isRunning);
  const selectComponent = useSceneStore((s) => s.selectComponent);
  const setHighlightedChain = useSceneStore((s) => s.setHighlightedChain);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);
  const connectionEditMode = useSceneStore((s) => s.connectionEditMode);

  const geometry = createGearGeometry(component.teeth, component.radius, component.thickness);

  let baseColor = '#64748b';
  let emissiveColor = '#000000';
  let emissiveIntensity = 0;

  if (showMeshPreview) {
    baseColor = '#22c55e';
    emissiveColor = '#16a34a';
    emissiveIntensity = 0.4;
  } else if (isPendingShaft) {
    baseColor = '#06b6d4';
    emissiveColor = '#0891b2';
    emissiveIntensity = 0.5;
  } else if (isShaftEditTarget && connectionEditMode === 'shaft') {
    baseColor = '#22d3ee';
    emissiveColor = '#06b6d4';
    emissiveIntensity = 0.5;
  } else if (isFocused) {
    baseColor = '#fbbf24';
    emissiveColor = '#d97706';
    emissiveIntensity = 0.5;
  } else if (isPendingBelt) {
    baseColor = '#a855f7';
    emissiveColor = '#7c3aed';
    emissiveIntensity = 0.4;
  } else if (isHighlighted) {
    baseColor = '#f97316';
    emissiveColor = '#ea580c';
    emissiveIntensity = 0.3;
  } else if (isSelected) {
    baseColor = '#3b82f6';
    emissiveColor = '#1d4ed8';
    emissiveIntensity = 0.3;
  }

  useFrame((_, delta) => {
    if (meshRef.current && isRunning) {
      const rpmToRadPerSec = (Math.PI * 2) / 60;
      const angularVelocity = component.currentSpeed * rpmToRadPerSec * (component.direction || 1);
      meshRef.current.rotation.y += angularVelocity * delta;
    }
  });

  const handleShaftClick = useSceneStore((s) => s.handleShaftEditClick);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (connectionEditMode === 'belt') return;
    if (connectionEditMode === 'shaft') {
      handleShaftClick(component.id);
      return;
    }
    selectComponent(component.id);
    const result = getTransmissionChain(component.id, gearConnections, beltConnections);
    setHighlightedChain(result);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    if (connectionEditMode === 'shaft') {
      document.body.style.cursor = isPendingShaft || isShaftEditTarget ? 'copy' : 'pointer';
    } else if (connectionEditMode === 'belt') {
      document.body.style.cursor = 'copy';
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
        geometry={geometry}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.7}
          roughness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {(isSelected || isHighlighted || isFocused || isPendingBelt || isPendingShaft || (isShaftEditTarget && connectionEditMode === 'shaft')) && (
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[component.radius + 0.1, component.radius + 0.18, 64]} />
          <meshBasicMaterial
            color={isPendingShaft ? '#06b6d4' : isShaftEditTarget && connectionEditMode === 'shaft' ? '#22d3ee' : isPendingBelt ? '#a855f7' : isFocused ? '#fbbf24' : isHighlighted ? '#f97316' : '#3b82f6'}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {isMountedOnShaft && (
        <>
          <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[component.radius + 0.22, component.radius + 0.3, 48]} />
            <meshBasicMaterial
              color="#06b6d4"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[component.radius + 0.24, component.radius + 0.26, 48]} />
            <meshBasicMaterial
              color="#22d3ee"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {showMeshPreview && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[component.radius + 0.2, component.radius + 0.28, 48]} />
          <meshBasicMaterial
            color="#22c55e"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <mesh position={[0, component.thickness / 2 + 0.05, 0]}>
        <cylinderGeometry args={[component.radius * 0.2, component.radius * 0.2, 0.1, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, -component.thickness / 2 - 0.05, 0]}>
        <cylinderGeometry args={[component.radius * 0.2, component.radius * 0.2, 0.1, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}
