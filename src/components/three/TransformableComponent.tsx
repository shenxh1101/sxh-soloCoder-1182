import { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneComponent, Vector3 } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { checkPositionValid } from '../../engine/CollisionDetector';
import { getComponentRadius, getComponentHeight } from '../../utils/geometry';
import { snapVector3ToGrid } from '../../utils/helpers';

interface TransformableComponentProps {
  component: SceneComponent;
  children: React.ReactNode;
}

export function TransformableComponent({ component, children }: TransformableComponentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const transformRef = useRef<any>(null);
  const { camera, gl } = useThree();
  const selectedComponentId = useSceneStore((s) => s.selectedComponentId);
  const selectComponent = useSceneStore((s) => s.selectComponent);
  const updateComponentPosition = useSceneStore((s) => s.updateComponentPosition);
  const updateComponentRotation = useSceneStore((s) => s.updateComponentRotation);
  const components = useSceneStore((s) => s.components);
  const isSelected = selectedComponentId === component.id;
  const [mode, setMode] = useState<'translate' | 'rotate'>('translate');
  const [tempPosition, setTempPosition] = useState<Vector3 | null>(null);
  const [positionValid, setPositionValid] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;
      if (e.key === 'r' || e.key === 'R') {
        setMode('rotate');
      } else if (e.key === 'g' || e.key === 'G') {
        setMode('translate');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const removeComponent = useSceneStore.getState().removeComponent;
        removeComponent(component.id);
      } else if (e.key === 'Escape') {
        selectComponent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, component.id, selectComponent]);

  useFrame(() => {
    if (!transformRef.current || !groupRef.current) return;

    if (isSelected) {
      const pos = groupRef.current.position;
      const radius = getComponentRadius(component);
      const valid = checkPositionValid(
        { x: pos.x, y: pos.y, z: pos.z },
        radius,
        components,
        component.id
      );
      setPositionValid(valid);
    }
  });

  const handleTransformChange = () => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    const rot = groupRef.current.rotation;

    setTempPosition({ x: pos.x, y: pos.y, z: pos.z });

    const radius = getComponentRadius(component);
    const valid = checkPositionValid(
      { x: pos.x, y: pos.y, z: pos.z },
      radius,
      components,
      component.id
    );
    setPositionValid(valid);
  };

  const handleTransformEnd = () => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    const rot = groupRef.current.rotation;

    const radius = getComponentRadius(component);
    const valid = checkPositionValid(
      { x: pos.x, y: pos.y, z: pos.z },
      radius,
      components,
      component.id
    );

    if (valid) {
      updateComponentPosition(component.id, { x: pos.x, y: pos.y, z: pos.z }, false);
      updateComponentRotation(component.id, { x: rot.x, y: rot.y, z: rot.z });
    } else if (tempPosition) {
      groupRef.current.position.set(
        component.position.x,
        component.position.y,
        component.position.z
      );
    }

    setTempPosition(null);
  };

  return (
    <group ref={groupRef}>
      {children}

      {isSelected && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current as any}
          mode={mode}
          onChange={handleTransformChange}
          onMouseUp={handleTransformEnd}
          showX={mode === 'translate' || mode === 'rotate'}
          showY={mode === 'translate' || mode === 'rotate'}
          showZ={mode === 'translate' || mode === 'rotate'}
          size={0.8}
        />
      )}

      {isSelected && transformRef.current && !positionValid && (
        <mesh position={[0, getComponentHeight(component) + 0.3, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
    </group>
  );
}
