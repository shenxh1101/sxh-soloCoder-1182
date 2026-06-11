import type { SceneComponent } from '../types';
import { ComponentType } from '../types';
import { getComponentRadius, getComponentHeight, getXYPlaneDistance, isOnSameYLevel } from '../utils/geometry';

const COLLISION_PADDING = 0.02;
const GEAR_MESH_TOLERANCE = 0.2;

const isGearPair = (a: SceneComponent, b: SceneComponent): boolean => {
  return a.type === ComponentType.GEAR && b.type === ComponentType.GEAR;
};

const isGearMeshDistance = (a: SceneComponent, b: SceneComponent): boolean => {
  if (!isGearPair(a, b)) return false;
  const radiusA = getComponentRadius(a);
  const radiusB = getComponentRadius(b);
  const distance = getXYPlaneDistance(a, b);
  const targetDistance = radiusA + radiusB;
  return Math.abs(distance - targetDistance) <= GEAR_MESH_TOLERANCE;
};

export const checkCollision = (
  component: SceneComponent,
  allComponents: SceneComponent[],
  excludeId?: string
): SceneComponent | null => {
  for (const other of allComponents) {
    if (other.id === excludeId || other.id === component.id) continue;
    if (checkPairCollision(component, other)) {
      return other;
    }
  }
  return null;
};

export const checkPairCollision = (a: SceneComponent, b: SceneComponent): boolean => {
  if (!isOnSameYLevel(a, b, getComponentHeight(a) / 2 + getComponentHeight(b) / 2)) {
    return false;
  }

  if (isGearMeshDistance(a, b)) {
    return false;
  }

  const distance = getXYPlaneDistance(a, b);
  const minDistance = getComponentRadius(a) + getComponentRadius(b) + COLLISION_PADDING;

  return distance < minDistance;
};

export const checkPositionValid = (
  position: { x: number; y: number; z: number },
  radius: number,
  allComponents: SceneComponent[],
  excludeId?: string,
  currentType?: ComponentType
): boolean => {
  for (const other of allComponents) {
    if (other.id === excludeId) continue;

    const otherY = other.position.y;
    const thisY = position.y;
    const heightDiff = Math.abs(thisY - otherY);
    const minHeightDiff = 0.1;

    if (heightDiff < minHeightDiff) {
      const otherRadius = getComponentRadius(other);
      const dx = position.x - other.position.x;
      const dz = position.z - other.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (currentType === ComponentType.GEAR && other.type === ComponentType.GEAR) {
        const targetDistance = radius + otherRadius;
        if (Math.abs(distance - targetDistance) <= GEAR_MESH_TOLERANCE) {
          continue;
        }
      }

      const minDistance = radius + otherRadius + COLLISION_PADDING;
      if (distance < minDistance) {
        return false;
      }
    }
  }
  return true;
};
