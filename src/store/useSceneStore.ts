import { create } from 'zustand';
import type {
  SceneComponent,
  GearConnection,
  BeltConnection,
  BackgroundType,
  Vector3,
  ComponentPreset,
  RotationDirection,
  ConnectionEditMode,
  MeasurementPair,
  SnappingSuggestion,
} from '../types';
import type { SaveData } from '../utils/exportUtils';
import { ComponentType } from '../types';
import { generateId, snapVector3ToGrid } from '../utils/helpers';
import {
  detectShaftAssemblies,
  computeMeasurements,
  getSnappingSuggestions,
  getTransmissionChain as _getTransmissionChain,
} from '../engine/TransmissionEngine';

export interface SaveDataV2 {
  version: string;
  timestamp: number;
  components: SceneComponent[];
  gearConnections: GearConnection[];
  beltConnections: BeltConnection[];
  manualBeltKeys: string[];
  deletedManualBeltKeys: string[];
  settings: {
    background: BackgroundType;
    explosionView: boolean;
    explosionFactor: number;
  };
}

export interface LoadError {
  message: string;
  details?: string;
  fileName?: string;
}

interface SceneState {
  components: SceneComponent[];
  gearConnections: GearConnection[];
  beltConnections: BeltConnection[];
  manualBeltKeys: Set<string>;
  deletedManualBeltKeys: Set<string>;
  isRunning: boolean;
  selectedComponentId: string | null;
  highlightedChain: string[];
  background: BackgroundType;
  explosionView: boolean;
  explosionFactor: number;
  draggingPreset: ComponentPreset | null;
  orderCounter: number;
  connectionEditMode: ConnectionEditMode;
  pendingBeltSelection: string | null;
  pendingShaftSelection: string | null;
  loadError: LoadError | null;
  focusComponentId: string | null;
  selectedChainId: string | null;
  measurements: MeasurementPair[];
  snappingSuggestions: SnappingSuggestion[];

  addComponent: (preset: ComponentPreset, position: Vector3) => void;
  removeComponent: (id: string) => void;
  updateComponentPosition: (id: string, position: Vector3, snap?: boolean) => void;
  updateComponentRotation: (id: string, rotation: Vector3) => void;
  updateComponentProperty: (id: string, props: Partial<SceneComponent>) => void;
  selectComponent: (id: string | null) => void;
  setGearConnections: (connections: GearConnection[]) => void;
  setBeltConnections: (connections: BeltConnection[]) => void;
  addBeltConnection: (pulleyAId: string, pulleyBId: string) => boolean;
  removeBeltConnection: (pulleyAId: string, pulleyBId: string) => void;
  toggleBeltConnection: (pulleyAId: string, pulleyBId: string) => void;

  mountComponentToShaft: (componentId: string, shaftId: string) => boolean;
  unmountComponentFromShaft: (componentId: string) => void;
  toggleShaftMount: (componentId: string, shaftId: string) => void;
  handleShaftEditClick: (componentId: string) => void;

  snapComponentToSuggestion: (componentId: string, suggestion: SnappingSuggestion) => void;
  snapNearestGearMesh: (componentId: string) => boolean;
  snapNearestCoaxial: (componentId: string) => boolean;

  toggleRunning: () => void;
  setRunning: (running: boolean) => void;
  setHighlightedChain: (ids: string[]) => void;
  setBackground: (bg: BackgroundType) => void;
  toggleExplosionView: () => void;
  setExplosionFactor: (factor: number) => void;
  setDraggingPreset: (preset: ComponentPreset | null) => void;
  updateComponentSpeeds: (speeds: Map<string, { speed: number; direction: RotationDirection }>) => void;
  clearScene: () => void;
  loadScene: (data: SaveData | SaveDataV2) => void;
  setConnectionEditMode: (mode: ConnectionEditMode) => void;
  setPendingBeltSelection: (id: string | null) => void;
  setPendingShaftSelection: (id: string | null) => void;
  handleBeltEditClick: (pulleyId: string) => void;
  setLoadError: (error: LoadError | null) => void;
  setFocusComponentId: (id: string | null) => void;
  setSelectedChainId: (id: string | null) => void;
  updateMeasurements: () => void;
  updateSnappingSuggestions: () => void;
  getTransmissionChain: (id: string) => string[];
  getShaftAssemblies: () => Map<string, string[]>;
  getSaveData: () => SaveDataV2;
}

const beltPairKey = (a: string, b: string) => [a, b].sort().join('-');

export const useSceneStore = create<SceneState>((set, get) => ({
  components: [],
  gearConnections: [],
  beltConnections: [],
  manualBeltKeys: new Set(),
  deletedManualBeltKeys: new Set(),
  isRunning: false,
  selectedComponentId: null,
  highlightedChain: [],
  background: 'dark',
  explosionView: false,
  explosionFactor: 1.0,
  draggingPreset: null,
  orderCounter: 0,
  connectionEditMode: null,
  pendingBeltSelection: null,
  pendingShaftSelection: null,
  loadError: null,
  focusComponentId: null,
  selectedChainId: null,
  measurements: [],
  snappingSuggestions: [],

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
      mountedOnShaftId: null,
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
    get().updateMeasurements();
    get().updateSnappingSuggestions();
  },

  removeComponent: (id) => {
    const state = get();
    const updatedManualKeys = new Set(state.manualBeltKeys);
    const updatedDeletedKeys = new Set(state.deletedManualBeltKeys);
    const comp = state.components.find((c) => c.id === id);
    if (comp && comp.type === ComponentType.PULLEY) {
      state.components.forEach((other) => {
        if (other.type === ComponentType.PULLEY && other.id !== id) {
          const k = beltPairKey(id, other.id);
          updatedManualKeys.delete(k);
          updatedDeletedKeys.delete(k);
        }
      });
    }

    set({
      components: state.components.filter((c) => c.id !== id),
      gearConnections: state.gearConnections.filter(
        (c) => c.gearAId !== id && c.gearBId !== id
      ),
      beltConnections: state.beltConnections.filter(
        (c) => c.fromPulleyId !== id && c.toPulleyId !== id
      ),
      manualBeltKeys: updatedManualKeys,
      deletedManualBeltKeys: updatedDeletedKeys,
      selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
      highlightedChain: state.highlightedChain.filter((c) => c !== id),
      pendingBeltSelection: state.pendingBeltSelection === id ? null : state.pendingBeltSelection,
      pendingShaftSelection: state.pendingShaftSelection === id ? null : state.pendingShaftSelection,
      focusComponentId: state.focusComponentId === id ? null : state.focusComponentId,
    });
    get().updateMeasurements();
    get().updateSnappingSuggestions();
  },

  updateComponentPosition: (id, position, snap = true) => {
    const pos = snap ? snapVector3ToGrid(position, 0.5) : position;
    const state = get();
    set({
      components: state.components.map((c) =>
        c.id === id ? { ...c, position: pos } : c
      ),
    });
    get().updateMeasurements();
    get().updateSnappingSuggestions();
  },

  updateComponentRotation: (id, rotation) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, rotation } : c
      ),
    }));
  },

  updateComponentProperty: (id, props) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? ({ ...c, ...props } as SceneComponent) : c
      ),
    }));
  },

  selectComponent: (id) => {
    const state = get();
    if (state.connectionEditMode === 'belt' && id) {
      const comp = state.components.find((c) => c.id === id);
      if (comp && comp.type === ComponentType.PULLEY) {
        get().handleBeltEditClick(id);
        return;
      }
    }
    if (state.connectionEditMode === 'shaft' && id) {
      const comp = state.components.find((c) => c.id === id);
      if (comp && (comp.type !== ComponentType.SHAFT)) {
        get().handleShaftEditClick(id);
        return;
      }
      if (comp && comp.type === ComponentType.SHAFT && state.pendingShaftSelection === null) {
        set({ pendingShaftSelection: id, selectedComponentId: id });
        return;
      }
    }
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

  addBeltConnection: (pulleyAId, pulleyBId) => {
    if (pulleyAId === pulleyBId) return false;
    const state = get();
    const exists = state.beltConnections.some(
      (c) =>
        (c.fromPulleyId === pulleyAId && c.toPulleyId === pulleyBId) ||
        (c.fromPulleyId === pulleyBId && c.toPulleyId === pulleyAId)
    );
    if (exists) return false;

    const key = beltPairKey(pulleyAId, pulleyBId);
    const newManual = new Set(state.manualBeltKeys);
    newManual.add(key);
    const newDeleted = new Set(state.deletedManualBeltKeys);
    newDeleted.delete(key);

    set({
      beltConnections: [
        ...state.beltConnections,
        {
          id: `belt-conn-${pulleyAId}-${pulleyBId}-${Date.now()}`,
          fromPulleyId: pulleyAId,
          toPulleyId: pulleyBId,
          manual: true,
        },
      ],
      manualBeltKeys: newManual,
      deletedManualBeltKeys: newDeleted,
    });
    return true;
  },

  removeBeltConnection: (pulleyAId, pulleyBId) => {
    const state = get();
    const key = beltPairKey(pulleyAId, pulleyBId);
    const newManual = new Set(state.manualBeltKeys);
    newManual.delete(key);
    const newDeleted = new Set(state.deletedManualBeltKeys);
    newDeleted.add(key);

    set({
      beltConnections: state.beltConnections.filter(
        (c) =>
          !((c.fromPulleyId === pulleyAId && c.toPulleyId === pulleyBId) ||
            (c.fromPulleyId === pulleyBId && c.toPulleyId === pulleyAId))
      ),
      manualBeltKeys: newManual,
      deletedManualBeltKeys: newDeleted,
    });
  },

  toggleBeltConnection: (pulleyAId, pulleyBId) => {
    const state = get();
    const exists = state.beltConnections.some(
      (c) =>
        (c.fromPulleyId === pulleyAId && c.toPulleyId === pulleyBId) ||
        (c.fromPulleyId === pulleyBId && c.toPulleyId === pulleyAId)
    );
    if (exists) {
      get().removeBeltConnection(pulleyAId, pulleyBId);
    } else {
      get().addBeltConnection(pulleyAId, pulleyBId);
    }
  },

  mountComponentToShaft: (componentId, shaftId) => {
    if (componentId === shaftId) return false;
    const state = get();
    const comp = state.components.find((c) => c.id === componentId);
    const shaft = state.components.find((c) => c.id === shaftId);
    if (!comp || !shaft || shaft.type !== ComponentType.SHAFT || comp.type === ComponentType.SHAFT) return false;

    const snapPos = {
      x: shaft.position.x,
      y: comp.position.y,
      z: shaft.position.z,
    };
    set({
      components: state.components.map((c) =>
        c.id === componentId
          ? { ...c, mountedOnShaftId: shaftId, position: snapPos }
          : c
      ),
    });
    get().updateMeasurements();
    get().updateSnappingSuggestions();
    return true;
  },

  unmountComponentFromShaft: (componentId) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.id === componentId ? { ...c, mountedOnShaftId: null } : c
      ),
    }));
    get().updateMeasurements();
    get().updateSnappingSuggestions();
  },

  toggleShaftMount: (componentId, shaftId) => {
    const comp = get().components.find((c) => c.id === componentId);
    if (comp?.mountedOnShaftId === shaftId) {
      get().unmountComponentFromShaft(componentId);
    } else {
      get().mountComponentToShaft(componentId, shaftId);
    }
  },

  handleShaftEditClick: (componentId) => {
    const state = get();
    if (state.pendingShaftSelection === null) {
      const comp = state.components.find((c) => c.id === componentId);
      if (comp && comp.type === ComponentType.SHAFT) {
        set({ pendingShaftSelection: componentId, selectedComponentId: componentId });
      } else {
        set({ pendingShaftSelection: componentId, selectedComponentId: componentId });
      }
    } else {
      const pendingId = state.pendingShaftSelection;
      const pendingComp = state.components.find((c) => c.id === pendingId);
      const targetComp = state.components.find((c) => c.id === componentId);

      if (pendingId === componentId) {
        set({ pendingShaftSelection: null, selectedComponentId: null });
        return;
      }

      if (pendingComp && targetComp) {
        if (pendingComp.type === ComponentType.SHAFT && targetComp.type !== ComponentType.SHAFT) {
          get().toggleShaftMount(componentId, pendingId);
        } else if (targetComp.type === ComponentType.SHAFT && pendingComp.type !== ComponentType.SHAFT) {
          get().toggleShaftMount(pendingId, componentId);
        }
      }
      set({ pendingShaftSelection: null, selectedComponentId: null });
    }
  },

  snapComponentToSuggestion: (componentId, suggestion) => {
    const state = get();
    const comp = state.components.find((c) => c.id === componentId);
    if (!comp) return;
    const snappedPos = snapVector3ToGrid(suggestion.targetPosition, 0.5);
    const updates: Partial<SceneComponent> = { position: snappedPos };
    if (suggestion.snapType === 'coaxial') {
      updates.mountedOnShaftId = suggestion.targetComponentId;
    }
    set({
      components: state.components.map((c) =>
        c.id === componentId ? ({ ...c, ...updates } as SceneComponent) : c
      ),
    });
    get().updateMeasurements();
    get().updateSnappingSuggestions();
  },

  snapNearestGearMesh: (componentId) => {
    const state = get();
    const comp = state.components.find((c) => c.id === componentId);
    if (!comp) return false;
    const suggestions = getSnappingSuggestions(comp, state.components).filter((s) => s.snapType === 'gear-mesh');
    if (suggestions.length === 0) return false;
    get().snapComponentToSuggestion(componentId, suggestions[0]);
    return true;
  },

  snapNearestCoaxial: (componentId) => {
    const state = get();
    const comp = state.components.find((c) => c.id === componentId);
    if (!comp) return false;
    const suggestions = getSnappingSuggestions(comp, state.components).filter((s) => s.snapType === 'coaxial');
    if (suggestions.length === 0) return false;
    get().snapComponentToSuggestion(componentId, suggestions[0]);
    return true;
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
      manualBeltKeys: new Set(),
      deletedManualBeltKeys: new Set(),
      isRunning: false,
      selectedComponentId: null,
      highlightedChain: [],
      orderCounter: 0,
      pendingBeltSelection: null,
      pendingShaftSelection: null,
      focusComponentId: null,
      measurements: [],
      snappingSuggestions: [],
      selectedChainId: null,
    });
  },

  loadScene: (data) => {
    let maxOrder = 0;
    data.components.forEach((c) => {
      if (c.orderIndex > maxOrder) maxOrder = c.orderIndex;
    });

    const v2 = data as SaveDataV2;
    const manualKeys = new Set<string>();
    const deletedKeys = new Set<string>();
    if (v2.manualBeltKeys) v2.manualBeltKeys.forEach((k) => manualKeys.add(k));
    if (v2.deletedManualBeltKeys) v2.deletedManualBeltKeys.forEach((k) => deletedKeys.add(k));

    const components = data.components.map((c) => ({
      ...c,
      mountedOnShaftId: c.mountedOnShaftId !== undefined ? c.mountedOnShaftId : null,
    }));

    set({
      components: components as SceneComponent[],
      gearConnections: data.gearConnections,
      beltConnections: data.beltConnections,
      manualBeltKeys: manualKeys,
      deletedManualBeltKeys: deletedKeys,
      orderCounter: maxOrder,
      isRunning: false,
      selectedComponentId: null,
      highlightedChain: [],
      background: data.settings?.background || 'dark',
      explosionView: data.settings?.explosionView || false,
      explosionFactor: data.settings?.explosionFactor || 1.0,
      pendingBeltSelection: null,
      pendingShaftSelection: null,
      focusComponentId: null,
      loadError: null,
      selectedChainId: null,
    });
    get().updateMeasurements();
    get().updateSnappingSuggestions();
  },

  setConnectionEditMode: (mode) => {
    set({
      connectionEditMode: mode,
      pendingBeltSelection: null,
      pendingShaftSelection: null,
      selectedComponentId: null,
    });
  },

  setPendingBeltSelection: (id) => {
    set({ pendingBeltSelection: id });
  },

  setPendingShaftSelection: (id) => {
    set({ pendingShaftSelection: id });
  },

  handleBeltEditClick: (pulleyId) => {
    const state = get();
    if (state.pendingBeltSelection === null) {
      set({ pendingBeltSelection: pulleyId, selectedComponentId: pulleyId });
    } else if (state.pendingBeltSelection === pulleyId) {
      set({ pendingBeltSelection: null, selectedComponentId: null });
    } else {
      get().toggleBeltConnection(state.pendingBeltSelection, pulleyId);
      set({ pendingBeltSelection: null, selectedComponentId: null });
    }
  },

  setLoadError: (error) => {
    set({ loadError: error });
  },

  setFocusComponentId: (id) => {
    set({ focusComponentId: id });
  },

  setSelectedChainId: (id) => {
    set({ selectedChainId: id });
  },

  updateMeasurements: () => {
    const state = get();
    const measurements = computeMeasurements(state.selectedComponentId, state.components);
    set({ measurements });
  },

  updateSnappingSuggestions: () => {
    const state = get();
    let suggestions: SnappingSuggestion[] = [];
    if (state.selectedComponentId) {
      const comp = state.components.find((c) => c.id === state.selectedComponentId);
      if (comp) {
        suggestions = getSnappingSuggestions(comp, state.components);
      }
    }
    set({ snappingSuggestions: suggestions });
  },

  getTransmissionChain: (id) => {
    const state = get();
    return _getTransmissionChain(id, state.gearConnections, state.beltConnections);
  },

  getShaftAssemblies: () => {
    return detectShaftAssemblies(get().components);
  },

  getSaveData: () => {
    const state = get();
    return {
      version: '2.1.0',
      timestamp: Date.now(),
      components: state.components,
      gearConnections: state.gearConnections,
      beltConnections: state.beltConnections,
      manualBeltKeys: Array.from(state.manualBeltKeys),
      deletedManualBeltKeys: Array.from(state.deletedManualBeltKeys),
      settings: {
        background: state.background,
        explosionView: state.explosionView,
        explosionFactor: state.explosionFactor,
      },
    };
  },
}));
