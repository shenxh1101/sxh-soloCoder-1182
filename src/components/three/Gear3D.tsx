import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GearComponent } from '../../types';
import { createGearGeometry } from '../../utils/geometry';
import { useSceneStore } from '../../store/useSceneStore';
import { getTransmissionChain } from '../../engine/TransmissionEngine';

interface Gear3DProps {
  component: GearComponent;
  isSelected: boolean;
  isHighlighted: boolean;
}

export function Gear3D({ component, isSelected, isHighlighted }: Gear3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const isRunning = useSceneStore((s) => s.isRunning);
  const selectComponent = useSceneStore((s) => s.selectComponent);
  const setHighlightedChain = useSceneStore((s) => s.setHighlightedChain);
  const getTransmissionChainFn = useSceneStore.getState;
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);

  const geometry = useMemo(
    () => createGearGeometry(component.teeth, component.radius, component.thickness),
    [component.teeth, component.radius, component.thickness]
  );

  const baseColor = useMemo(() => {
    if (isHighlighted) return '#f97316';
    if (isSelected) return '#3b82f6';
    return '#64748b';
  }, [isSelected, isHighlighted]);

  const emissiveColor = useMemo(() => {
    if (isHighlighted) return '#f97316';
    if (isSelected) return '#1e40af';
    return '#000000';
  }, [isSelected, isHighlighted]);

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
      ref={groupRef}
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
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={isSelected || isHighlighted ? 0.3 : 0}
          metalness={0.7}
          roughness={0.3}
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
