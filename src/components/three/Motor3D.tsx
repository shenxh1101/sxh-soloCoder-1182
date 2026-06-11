import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotorComponent } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';

interface Motor3DProps {
  component: MotorComponent;
  isSelected: boolean;
  isHighlighted: boolean;
  isFocused: boolean;
}

export function Motor3D({ component, isSelected, isHighlighted, isFocused }: Motor3DProps) {
  const fanRef = useRef<THREE.Group>(null);
  const isRunning = useSceneStore((s) => s.isRunning);
  const selectComponent = useSceneStore((s) => s.selectComponent);
  const connectionEditMode = useSceneStore((s) => s.connectionEditMode);

  let bodyColor = '#ef4444';
  let emissive = '#7f1d1d';
  let emissiveIntensity = 0.1;

  if (isFocused) {
    bodyColor = '#fbbf24';
    emissive = '#d97706';
    emissiveIntensity = 0.4;
  } else if (isHighlighted) {
    bodyColor = '#f97316';
    emissive = '#ea580c';
    emissiveIntensity = 0.3;
  } else if (isSelected) {
    bodyColor = '#3b82f6';
    emissive = '#1d4ed8';
    emissiveIntensity = 0.3;
  }

  useFrame((_, delta) => {
    if (fanRef.current && isRunning && component.running) {
      const rpmToRadPerSec = (Math.PI * 2) / 60;
      fanRef.current.rotation.y += component.speed * rpmToRadPerSec * component.direction * delta;
    }
  });

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
    <group
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.6, 32]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      <group ref={fanRef} position={[0, 0.65, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 0.05, 0.15]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.8, 0.05, 0.15]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.3, 32]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.15, 32]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.15} />
      </mesh>

      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[1.2, 0.1, 0.8]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>

      {isRunning && component.running && (
        <mesh position={[0.35, 0.5, 0.35]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      )}

      {(isSelected || isHighlighted || isFocused) && (
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.8, 32]} />
          <meshBasicMaterial
            color={isFocused ? '#fbbf24' : isHighlighted ? '#f97316' : '#3b82f6'}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
