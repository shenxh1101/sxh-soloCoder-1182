import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PulleyComponent } from '../../types';
import { createPulleyGeometry } from '../../utils/geometry';
import { useSceneStore } from '../../store/useSceneStore';
import { getTransmissionChain } from '../../engine/TransmissionEngine';

interface Pulley3DProps {
  component: PulleyComponent;
  isSelected: boolean;
  isHighlighted: boolean;
  isFocused: boolean;
  isBeltEditTarget: boolean;
  isPendingBelt: boolean;
  isMountedOnShaft?: boolean;
  isShaftEditTarget?: boolean;
  isPendingShaft?: boolean;
}

export function Pulley3D({ component, isSelected, isHighlighted, isFocused, isBeltEditTarget, isPendingBelt, isMountedOnShaft, isShaftEditTarget, isPendingShaft }: Pulley3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isRunning = useSceneStore((s) => s.isRunning);
  const selectComponent = useSceneStore((s) => s.selectComponent);
  const setHighlightedChain = useSceneStore((s) => s.setHighlightedChain);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);
  const connectionEditMode = useSceneStore((s) => s.connectionEditMode);

  const geometry = createPulleyGeometry(component.radius, component.thickness);

  let color = '#a855f7';
  let emissive = '#000000';
  let emissiveIntensity = 0;

  if (isPendingShaft) {
    color = '#06b6d4';
    emissive = '#0891b2';
    emissiveIntensity = 0.6;
  } else if (isShaftEditTarget && connectionEditMode === 'shaft') {
    color = '#22d3ee';
    emissive = '#06b6d4';
    emissiveIntensity = 0.5;
  } else if (isFocused) {
    color = '#fbbf24';
    emissive = '#d97706';
    emissiveIntensity = 0.4;
  } else if (isPendingBelt) {
    color = '#a855f7';
    emissive = '#7c3aed';
    emissiveIntensity = 0.6;
  } else if (isBeltEditTarget && connectionEditMode === 'belt') {
    color = '#22c55e';
    emissive = '#16a34a';
    emissiveIntensity = 0.5;
  } else if (isHighlighted) {
    color = '#f97316';
    emissive = '#ea580c';
    emissiveIntensity = 0.3;
  } else if (isSelected) {
    color = '#3b82f6';
    emissive = '#1d4ed8';
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
    if (connectionEditMode === 'shaft') {
      handleShaftClick(component.id);
      return;
    }
    selectComponent(component.id);
    if (connectionEditMode !== 'belt') {
      const result = getTransmissionChain(component.id, gearConnections, beltConnections);
      setHighlightedChain(result);
    }
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
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={0.6}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {(isSelected || isHighlighted || isFocused || isPendingBelt || isPendingShaft || (isBeltEditTarget && connectionEditMode === 'belt') || (isShaftEditTarget && connectionEditMode === 'shaft')) && (
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[component.radius + 0.1, component.radius + 0.18, 64]} />
          <meshBasicMaterial
            color={isPendingShaft ? '#06b6d4' : isShaftEditTarget && connectionEditMode === 'shaft' ? '#22d3ee' : isPendingBelt ? '#a855f7' : isBeltEditTarget && connectionEditMode === 'belt' ? '#22c55e' : isFocused ? '#fbbf24' : isHighlighted ? '#f97316' : '#3b82f6'}
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

      {connectionEditMode === 'belt' && (
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
          <meshBasicMaterial
            color={isPendingBelt ? '#a855f7' : '#22c55e'}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}
