import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotorComponent } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';

interface Motor3DProps {
  component: MotorComponent;
  isSelected: boolean;
  isHighlighted: boolean;
}

export function Motor3D({ component, isSelected, isHighlighted }: Motor3DProps) {
  const fanRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const isRunning = useSceneStore((s) => s.isRunning);
  const selectComponent = useSceneStore((s) => s.selectComponent);

  const color = isSelected ? '#3b82f6' : isHighlighted ? '#f97316' : '#ef4444';
  const emissive = isSelected ? '#1e40af' : isHighlighted ? '#c2410c' : '#7f1d1d';

  useFrame((_, delta) => {
    if (fanRef.current && isRunning && component.running) {
      const rpmToRadPerSec = (Math.PI * 2) / 60;
      fanRef.current.rotation.y += component.speed * rpmToRadPerSec * component.direction * delta;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectComponent(component.id);
  };

  return (
    <group
      ref={groupRef}
      position={[component.position.x, component.position.y, component.position.z]}
      rotation={[component.rotation.x, component.rotation.y, component.rotation.z]}
      onClick={handleClick}
    >
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.6, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isSelected || isHighlighted ? 0.3 : 0.1}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      <mesh ref={fanRef} position={[0, 0.65, 0]}>
        <boxGeometry args={[0.8, 0.05, 0.15]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh ref={fanRef} position={[0, 0.65, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.8, 0.05, 0.15]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>

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

      {(isSelected || isHighlighted) && (
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.8, 32]} />
          <meshBasicMaterial
            color={isHighlighted ? '#f97316' : '#3b82f6'}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
