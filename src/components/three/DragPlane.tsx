import { useRef, useMemo, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ComponentPreset, Vector3 } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { snapVector3ToGrid } from '../../utils/helpers';
import { checkPositionValid } from '../../engine/CollisionDetector';
import { getComponentRadius } from '../../utils/geometry';

interface DragPlaneProps {
  onDrop?: (position: Vector3) => void;
}

export function DragPlane({ onDrop }: DragPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, raycaster, pointer } = useThree();
  const draggingPreset = useSceneStore((s) => s.draggingPreset);
  const setDraggingPreset = useSceneStore((s) => s.setDraggingPreset);
  const addComponent = useSceneStore((s) => s.addComponent);
  const components = useSceneStore((s) => s.components);
  const hoverPosition = useRef<Vector3 | null>(null);

  const previewPosition = useMemo(() => new THREE.Vector3(), []);
  const previewVisible = useRef(false);
  const previewValid = useRef(true);

  useFrame(() => {
    if (!draggingPreset || !meshRef.current) {
      previewVisible.current = false;
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.1);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);

    if (intersect) {
      const snapped = snapVector3ToGrid(
        { x: intersect.x, y: 0.1, z: intersect.z },
        0.5
      );
      previewPosition.set(snapped.x, snapped.y, snapped.z);
      hoverPosition.current = snapped;

      const radius = (draggingPreset.defaultProps as any).radius || 0.5;
      previewValid.current = checkPositionValid(snapped, radius, components);
      previewVisible.current = true;

      if (meshRef.current) {
        meshRef.current.position.copy(previewPosition);
        meshRef.current.visible = true;
      }
    }
  });

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    if (draggingPreset && hoverPosition.current && previewValid.current) {
      addComponent(draggingPreset, hoverPosition.current);
      onDrop?.(hoverPosition.current);
    }
    setDraggingPreset(null);
    previewVisible.current = false;
    if (meshRef.current) {
      meshRef.current.visible = false;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraggingPreset(null);
        previewVisible.current = false;
        if (meshRef.current) {
          meshRef.current.visible = false;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setDraggingPreset]);

  if (!draggingPreset) return null;

  const previewRadius = (draggingPreset.defaultProps as any).radius || 0.5;

  return (
    <>
      <mesh
        ref={meshRef}
        visible={false}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerUp={handlePointerUp}
      >
        <ringGeometry args={[previewRadius, previewRadius + 0.1, 48]} />
        <meshBasicMaterial
          color={previewValid.current ? '#22c55e' : '#ef4444'}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}
