import * as THREE from 'three';
import type { SceneComponent, GearComponent, PulleyComponent, MotorComponent, ShaftComponent } from '../types';
import { ComponentType } from '../types';

export const getComponentRadius = (comp: SceneComponent): number => {
  switch (comp.type) {
    case ComponentType.GEAR:
      return (comp as GearComponent).radius;
    case ComponentType.PULLEY:
      return (comp as PulleyComponent).radius;
    case ComponentType.SHAFT:
      return (comp as ShaftComponent).radius;
    case ComponentType.MOTOR:
      return 0.6;
    default:
      return 0.5;
  }
};

export const getComponentHeight = (comp: SceneComponent): number => {
  switch (comp.type) {
    case ComponentType.GEAR:
      return (comp as GearComponent).thickness;
    case ComponentType.PULLEY:
      return (comp as PulleyComponent).thickness;
    case ComponentType.SHAFT:
      return (comp as ShaftComponent).length;
    case ComponentType.MOTOR:
      return 1.0;
    default:
      return 0.5;
  }
};

export const getCenterDistance = (
  a: { position: { x: number; y: number; z: number } },
  b: { position: { x: number; y: number; z: number } }
): number => {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const dz = a.position.z - b.position.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const getXYPlaneDistance = (
  a: { position: { x: number; y: number; z: number } },
  b: { position: { x: number; y: number; z: number } }
): number => {
  const dx = a.position.x - b.position.x;
  const dz = a.position.z - b.position.z;
  return Math.sqrt(dx * dx + dz * dz);
};

export const isOnSameYLevel = (
  a: { position: { y: number } },
  b: { position: { y: number } },
  tolerance: number = 0.3
): boolean => {
  return Math.abs(a.position.y - b.position.y) < tolerance;
};

export const createGearGeometry = (teeth: number, radius: number, thickness: number): THREE.BufferGeometry => {
  const toothDepth = radius * 0.15;
  const toothWidth = (2 * Math.PI) / (teeth * 2);
  const innerRadius = radius - toothDepth;

  const shape = new THREE.Shape();
  const points: THREE.Vector2[] = [];

  for (let i = 0; i < teeth; i++) {
    const angle1 = (i * 2 * Math.PI) / teeth;
    const angle2 = angle1 + toothWidth * 0.3;
    const angle3 = angle1 + toothWidth * 0.7;
    const angle4 = angle1 + toothWidth;

    points.push(new THREE.Vector2(Math.cos(angle1) * innerRadius, Math.sin(angle1) * innerRadius));
    points.push(new THREE.Vector2(Math.cos(angle2) * radius, Math.sin(angle2) * radius));
    points.push(new THREE.Vector2(Math.cos(angle3) * radius, Math.sin(angle3) * radius));
    points.push(new THREE.Vector2(Math.cos(angle4) * innerRadius, Math.sin(angle4) * innerRadius));
  }

  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].y);
  }
  shape.closePath();

  const holePath = new THREE.Path();
  const holeRadius = radius * 0.2;
  holePath.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -thickness / 2, 0);
  geometry.computeVertexNormals();

  return geometry;
};

export const createPulleyGeometry = (radius: number, thickness: number): THREE.BufferGeometry => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);

  const holePath = new THREE.Path();
  holePath.absarc(0, 0, radius * 0.15, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -thickness / 2, 0);
  geometry.computeVertexNormals();

  return geometry;
};

export const getRotatableComponents = (
  components: SceneComponent[]
): (GearComponent | PulleyComponent | MotorComponent)[] => {
  return components.filter(
    (c) =>
      c.type === ComponentType.GEAR ||
      c.type === ComponentType.PULLEY ||
      c.type === ComponentType.MOTOR
  ) as (GearComponent | PulleyComponent | MotorComponent)[];
};
