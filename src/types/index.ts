export enum ComponentType {
  GEAR = 'gear',
  SHAFT = 'shaft',
  PULLEY = 'pulley',
  MOTOR = 'motor',
}

export type RotationDirection = 1 | -1;

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BaseComponent {
  id: string;
  type: ComponentType;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  name: string;
  orderIndex: number;
  mountedOnShaftId?: string | null;
}

export interface GearComponent extends BaseComponent {
  type: ComponentType.GEAR;
  teeth: number;
  radius: number;
  thickness: number;
  currentSpeed: number;
  direction: RotationDirection;
}

export interface ShaftComponent extends BaseComponent {
  type: ComponentType.SHAFT;
  length: number;
  radius: number;
}

export interface PulleyComponent extends BaseComponent {
  type: ComponentType.PULLEY;
  radius: number;
  thickness: number;
  currentSpeed: number;
  direction: RotationDirection;
}

export interface MotorComponent extends BaseComponent {
  type: ComponentType.MOTOR;
  speed: number;
  direction: RotationDirection;
  running: boolean;
}

export type SceneComponent = GearComponent | ShaftComponent | PulleyComponent | MotorComponent;

export interface GearConnection {
  id: string;
  gearAId: string;
  gearBId: string;
  ratio: number;
}

export interface BeltConnection {
  id: string;
  fromPulleyId: string;
  toPulleyId: string;
  manual?: boolean;
}

export interface ShaftAssembly {
  shaftId: string;
  mountedComponentIds: string[];
}

export interface MeasurementPair {
  id: string;
  componentAId: string;
  componentBId: string;
  type: 'center-distance' | 'gear-mesh' | 'belt-length';
  currentValue: number;
  targetValue?: number;
  deviation?: number;
}

export interface SnappingSuggestion {
  targetComponentId: string;
  snapType: 'gear-mesh' | 'coaxial' | 'belt-distance';
  targetPosition: Vector3;
  distance: number;
}

export type BackgroundType = 'dark' | 'blueprint' | 'transparent';

export type ConnectionEditMode = null | 'belt' | 'shaft';

export interface ComponentPreset {
  type: ComponentType;
  name: string;
  label: string;
  icon: string;
  defaultProps: Partial<SceneComponent>;
}

export const GEAR_PRESETS: ComponentPreset[] = [
  { type: ComponentType.GEAR, name: 'gear_12', label: '12齿齿轮', icon: 'settings', defaultProps: { teeth: 12, radius: 0.6, thickness: 0.2 } as Partial<GearComponent> },
  { type: ComponentType.GEAR, name: 'gear_20', label: '20齿齿轮', icon: 'settings', defaultProps: { teeth: 20, radius: 1.0, thickness: 0.2 } as Partial<GearComponent> },
  { type: ComponentType.GEAR, name: 'gear_32', label: '32齿齿轮', icon: 'settings', defaultProps: { teeth: 32, radius: 1.6, thickness: 0.2 } as Partial<GearComponent> },
  { type: ComponentType.GEAR, name: 'gear_48', label: '48齿齿轮', icon: 'settings', defaultProps: { teeth: 48, radius: 2.4, thickness: 0.2 } as Partial<GearComponent> },
];

export const PULLEY_PRESETS: ComponentPreset[] = [
  { type: ComponentType.PULLEY, name: 'pulley_small', label: '小皮带轮', icon: 'disc', defaultProps: { radius: 0.5, thickness: 0.3 } as Partial<PulleyComponent> },
  { type: ComponentType.PULLEY, name: 'pulley_medium', label: '中皮带轮', icon: 'disc', defaultProps: { radius: 1.0, thickness: 0.3 } as Partial<PulleyComponent> },
  { type: ComponentType.PULLEY, name: 'pulley_large', label: '大皮带轮', icon: 'disc', defaultProps: { radius: 1.5, thickness: 0.3 } as Partial<PulleyComponent> },
];

export const SHAFT_PRESETS: ComponentPreset[] = [
  { type: ComponentType.SHAFT, name: 'shaft_short', label: '短传动轴', icon: 'minus', defaultProps: { length: 1.5, radius: 0.08 } as Partial<ShaftComponent> },
  { type: ComponentType.SHAFT, name: 'shaft_medium', label: '中传动轴', icon: 'minus', defaultProps: { length: 3.0, radius: 0.08 } as Partial<ShaftComponent> },
  { type: ComponentType.SHAFT, name: 'shaft_long', label: '长传动轴', icon: 'minus', defaultProps: { length: 5.0, radius: 0.08 } as Partial<ShaftComponent> },
];

export const MOTOR_PRESETS: ComponentPreset[] = [
  { type: ComponentType.MOTOR, name: 'motor_standard', label: '标准电机', icon: 'zap', defaultProps: { speed: 60, direction: 1, running: true } as Partial<MotorComponent> },
];

export const COAXIAL_SNAP_TOLERANCE = 0.35;
export const GEAR_SNAP_DISTANCE = 1.2;
export const BELT_AUTO_MIN_RATIO = 0.8;
export const BELT_AUTO_MAX_RATIO = 3.0;
