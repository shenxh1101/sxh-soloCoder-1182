export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const snapToGrid = (value: number, gridSize: number = 0.5): number => {
  return Math.round(value / gridSize) * gridSize;
};

export const snapVector3ToGrid = (
  vec: { x: number; y: number; z: number },
  gridSize: number = 0.5
): { x: number; y: number; z: number } => {
  return {
    x: snapToGrid(vec.x, gridSize),
    y: snapToGrid(vec.y, gridSize),
    z: snapToGrid(vec.z, gridSize),
  };
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const degToRad = (deg: number): number => {
  return (deg * Math.PI) / 180;
};

export const radToDeg = (rad: number): number => {
  return (rad * 180) / Math.PI;
};
