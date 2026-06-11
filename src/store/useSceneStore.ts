import { create } from 'zustand';
import type {
  SceneComponent,
  GearConnection,
  BeltConnection,
  BackgroundType,
  Vector3,
  ComponentPreset,
  RotationDirection,
} from '../types';
import { ComponentType } from '../types';
import { generateId, snapVector3ToGrid } from '../utils/helpers';

interface SceneState {
  components: SceneComponent[];
  gearConnections: GearConnection[];
  beltConnections: BeltConnection[];
  isRunning: boolean;
  selectedComponentId: string | null;
  highlightedChain: string[];
  background: BackgroundType;
  explosionView: boolean;
  explosionFactor: number;
  draggingPreset: ComponentPreset | null;
  orderCounter: number;

  addComponent: (preset: ComponentPreset, position: Vector3) => void;
  removeComponent: (id: string) => void;
  updateComponentPosition: (id: string, position: Vector3, snap?: boolean) => void;
  updateComponentRotation: (id: string, rotation: Vector3) => void;
  updateComponentProperty: (id: string, props: Partial<SceneComponent>) => void;
  selectComponent: (id: string | null) => void;
  setGearConnections: (connections: GearConnection[]) => void;
  setBeltConnections: (connections: BeltConnection[]) => void;
  toggleRunning: () => void;
  setRunning: (running: boolean) => void;
  setHighlightedChain: (ids: string[]) => void;
  setBackground: (bg: BackgroundType) => void;
  toggleExplosionView: () => void;
  setExplosionFactor: (factor: number) => void;
  setDraggingPreset: (preset: ComponentPreset | null) => void;
  updateComponentSpeeds: (speeds: Map<string, { speed: number; direction: RotationDirection }>) => void;
  clearScene: () => void;
  loadScene: (data: {
    components: SceneComponent[];
    gearConnections: GearConnection[];
    beltConnections: BeltConnection[];
  }) => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  components: [],
  gearConnections: [],
  beltConnections: [],
  isRunning: false,
  selectedComponentId: null,
  highlightedChain: [],
  background: 'dark',
  explosionView: false,
  explosionFactor: 1.0,
  draggingPreset: null,
  orderCounter: 0,

  addComponent: (preset, position) => {
    const state = get();
    const snappedPos = snapVector3ToGrid(position, 0.5);
    const baseName = preset.label.replace(/\s/g, '_').toLowerCase();

    let newComponent: SceneComponent;
    const common = {
      id: generateId(),
      type: preset.type,
      position: snappedPos,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      name: `${baseName}_${state.orderCounter + 1}`,
      orderIndex: state.orderCounter + 1,
    };

    switch (preset.type) {
      case ComponentType.GEAR:
        newComponent = {
          ...common,
          teeth: (preset.defaultProps as any).teeth || 20,
          radius: (preset.defaultProps as any).radius || 1.0,
          thickness: (preset.defaultProps as any).thickness || 0.2,
          currentSpeed: 0,
          direction: 1 as RotationDirection,
        } as any;
        break;
      case ComponentType.PULLEY:
        newComponent = {
          ...common,
          radius: (preset.defaultProps as any).radius || 1.0,
          thickness: (preset.defaultProps as any).thickness || 0.3,
          currentSpeed: 0,
          direction: 1 as RotationDirection,
        } as any;
        break;
      case ComponentType.SHAFT:
        newComponent = {
          ...common,
          length: (preset.defaultProps as any).length || 2.0,
          radius: (preset.defaultProps as any).radius || 0.08,
        } as any;
        break;
      case ComponentType.MOTOR:
        newComponent = {
          ...common,
          speed: (preset.defaultProps as any).speed || 60,
          direction: ((preset.defaultProps as any).direction || 1) as RotationDirection,
          running: true,
        } as any;
        break;
      default:
        return;
    }

    set({
      components: [...state.components, newComponent],
      orderCounter: state.orderCounter + 1,
      selectedComponentId: newComponent.id,
    });
  },

  removeComponent: (id) => {
    const state = get();
    set({
      components: state.components.filter((c) => c.id !== id),
      gearConnections: state.gearConnections.filter(
        (c) => c.gearAId !== id && c.gearBId !== id
      ),
      beltConnections: state.beltConnections.filter(
        (c) => c.fromPulleyId !== id && c.toPulleyId !== id
      ),
      selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
      highlightedChain: state.highlightedChain.filter((c) => c !== id),
    });
  },

  updateComponentPosition: (id, position, snap = true) => {
    const pos = snap ? snapVector3ToGrid(position, 0.5) : position;
    const state = get();
    set({
      components: state.components.map((c) =>
        c.id === id ? { ...c, position: pos } : c
      ),
    });
  },

  updateComponentRotation: (id, rotation) => {
    const state = get();
    set({
      components: state.components.map((c) =>
        c.id === id ? { ...c, rotation } : c
      ),
    });
  },

  updateComponentProperty: (id, props) => {
    const state = get();
    set({
      components: state.components.map((c) =>
        c.id === id ? ({ ...c, ...props } as SceneComponent) : c
      ),
    });
  },

  selectComponent: (id) => {
    set({ selectedComponentId: id });
    if (!id) {
      set({ highlightedChain: [] });
    }
  },

  setGearConnections: (connections) => {
    set({ gearConnections: connections });
  },

  setBeltConnections: (connections) => {
    set({ beltConnections: connections });
  },

  toggleRunning: () => {
    set((state) => ({ isRunning: !state.isRunning }));
  },

  setRunning: (running) => {
    set({ isRunning: running });
  },

  setHighlightedChain: (ids) => {
    set({ highlightedChain: ids });
  },

  setBackground: (bg) => {
    set({ background: bg });
  },

  toggleExplosionView: () => {
    set((state) => ({ explosionView: !state.explosionView }));
  },

  setExplosionFactor: (factor) => {
    set({ explosionFactor: factor });
  },

  setDraggingPreset: (preset) => {
    set({ draggingPreset: preset });
  },

  updateComponentSpeeds: (speeds) => {
    const state = get();
    set({
      components: state.components.map((c) => {
        const speedInfo = speeds.get(c.id);
        if (speedInfo) {
          return { ...c, currentSpeed: speedInfo.speed, direction: speedInfo.direction } as any;
        }
        if (c.type !== ComponentType.SHAFT) {
          return { ...c, currentSpeed: 0 } as any;
        }
        return c;
      }),
    });
  },

  clearScene: () => {
    set({
      components: [],
      gearConnections: [],
      beltConnections: [],
      isRunning: false,
      selectedComponentId: null,
      highlightedChain: [],
      orderCounter: 0,
    });
  },

  loadScene: (data) => {
    let maxOrder = 0;
    data.components.forEach((c) => {
      if (c.orderIndex > maxOrder) maxOrder = c.orderIndex;
    });
    set({
      components: data.components,
      gearConnections: data.gearConnections,
      beltConnections: data.beltConnections,
      orderCounter: maxOrder,
      isRunning: false,
      selectedComponentId: null,
      highlightedChain: [],
    });
  },
}));
