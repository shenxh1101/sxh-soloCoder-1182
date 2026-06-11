import { useRef, useMemo } from 'react';
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
}

export function Pulley3D({ component, isSelected, isHighlighted }: Pulley3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isRunning = useSceneStore((s) => s.isRunning);
  const selectComponent = useSceneStore((s) => s.selectComponent);
  const setHighlightedChain = useSceneStore((s) => s.setHighlightedChain);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);

  const geometry = useMemo(
    () => createPulleyGeometry(component.radius, component.thickness),
    [component.radius, component.thickness]
  );

  const color = isSelected ? '#3b82f6' : isHighlighted ? '#f97316' : '#a855f7';
  const emissive = isSelected ? '#1e40af' : isHighlighted ? '#c2410c' : '#000000';

  useFrame((_, delta) => {
    if (meshRef.current && isRunning) {
      const rpmToRadPerSec = (Math.PI * 2) / 60;
      const angularVelocity = component.currentSpeed * rpmToRadPerSec * (component.direction || 1);
      meshRef.current.rotation.y += angularVelocity * delta;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectComponent(component.id);
    const result = getTransmissionChain(component.id, gearConnections, beltConnections);
    setHighlightedChain(result);
  };

  return (
    <group
      position={[component.position.x, component.position.y, component.position.z]}
      rotation={[component.rotation.x, component.rotation.y, component.rotation.z]}
    >
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isSelected || isHighlighted ? 0.3 : 0}
          metalness={0.6}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {(isSelected || isHighlighted) && (
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[component.radius + 0.1, component.radius + 0.15, 64]} />
          <meshBasicMaterial
            color={isHighlighted ? '#f97316' : '#3b82f6'}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
