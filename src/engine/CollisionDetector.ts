import type { SceneComponent } from '../types';
import { getComponentRadius, getComponentHeight, getXYPlaneDistance, isOnSameYLevel } from '../utils/geometry';

const COLLISION_PADDING = 0.05;

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

  const distance = getXYPlaneDistance(a, b);
  const minDistance = getComponentRadius(a) + getComponentRadius(b) + COLLISION_PADDING;

  return distance < minDistance;
};

export const checkPositionValid = (
  position: { x: number; y: number; z: number },
  radius: number,
  allComponents: SceneComponent[],
  excludeId?: string
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
      const minDistance = radius + otherRadius + COLLISION_PADDING;

      if (distance < minDistance) {
        return false;
      }
    }
  }
  return true;
};
