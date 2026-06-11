import { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneComponent, Vector3 } from '../../types';
import { ComponentType } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { checkPositionValid } from '../../engine/CollisionDetector';
import { getComponentRadius, getComponentHeight } from '../../utils/geometry';

interface TransformableComponentProps {
  component: SceneComponent;
  children: React.ReactNode;
  isSelected: boolean;
}

export function TransformableComponent({ component, children, isSelected }: TransformableComponentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const transformRef = useRef<any>(null);
  const { camera, gl } = useThree();
  const selectComponent = useSceneStore((s) => s.selectComponent);
  const updateComponentPosition = useSceneStore((s) => s.updateComponentPosition);
  const updateComponentRotation = useSceneStore((s) => s.updateComponentRotation);
  const components = useSceneStore((s) => s.components);
  const [mode, setMode] = useState<'translate' | 'rotate'>('translate');
  const [positionValid, setPositionValid] = useState(true);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(
      component.position.x,
      component.position.y,
      component.position.z
    );
    groupRef.current.rotation.set(
      component.rotation.x,
      component.rotation.y,
      component.rotation.z
    );
  }, [component.position.x, component.position.y, component.position.z, component.rotation.x, component.rotation.y, component.rotation.z]);

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

  const handleTransformChange = () => {
    if (!groupRef.current) return;
    const now = Date.now();
    if (now - lastUpdateRef.current < 30) return;
    lastUpdateRef.current = now;

    const pos = groupRef.current.position;
    const radius = getComponentRadius(component);
    const valid = checkPositionValid(
      { x: pos.x, y: pos.y, z: pos.z },
      radius,
      components,
      component.id,
      component.type
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
      component.id,
      component.type
    );

    if (valid) {
      updateComponentPosition(component.id, { x: pos.x, y: pos.y, z: pos.z }, false);
      updateComponentRotation(component.id, { x: rot.x, y: rot.y, z: rot.z });
    } else {
      groupRef.current.position.set(
        component.position.x,
        component.position.y,
        component.position.z
      );
      groupRef.current.rotation.set(
        component.rotation.x,
        component.rotation.y,
        component.rotation.z
      );
      setPositionValid(true);
    }
  };

  const indicatorHeight = component.type === ComponentType.MOTOR
    ? 1.5
    : getComponentHeight(component) + 0.5;

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
          showX
          showY
          showZ
          size={0.7}
          space={mode === 'rotate' ? 'local' : 'world'}
        />
      )}

      {isSelected && !positionValid && (
        <mesh position={[0, indicatorHeight, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
    </group>
  );
}
