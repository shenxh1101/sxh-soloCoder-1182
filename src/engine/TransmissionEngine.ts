import type {
  SceneComponent,
  GearComponent,
  PulleyComponent,
  MotorComponent,
  GearConnection,
  BeltConnection,
  RotationDirection,
  ShaftComponent,
  MeasurementPair,
  SnappingSuggestion,
  Vector3,
} from '../types';
import { ComponentType, COAXIAL_SNAP_TOLERANCE, GEAR_SNAP_DISTANCE } from '../types';
import { getComponentRadius, getXYPlaneDistance, isOnSameYLevel } from '../utils/geometry';

const GEAR_MESH_TOLERANCE = 0.18;
const BELT_CONNECT_TOLERANCE = 0.35;
const COAXIAL_TOLERANCE = COAXIAL_SNAP_TOLERANCE;

export const getShaftMountedComponents = (
  shaftId: string,
  components: SceneComponent[]
): SceneComponent[] => {
  return components.filter((c) => c.mountedOnShaftId === shaftId);
};

export const isCoaxialWithShaft = (
  component: SceneComponent,
  shaft: ShaftComponent
): boolean => {
  const dx = component.position.x - shaft.position.x;
  const dz = component.position.z - shaft.position.z;
  return Math.sqrt(dx * dx + dz * dz) < COAXIAL_TOLERANCE;
};

export const detectShaftAssemblies = (components: SceneComponent[]): Map<string, string[]> => {
  const shafts = components.filter((c) => c.type === ComponentType.SHAFT) as ShaftComponent[];
  const assemblies = new Map<string, string[]>();

  shafts.forEach((shaft) => {
    const mounted = components
      .filter((c) => c.id !== shaft.id && c.type !== ComponentType.SHAFT)
      .filter((c) => {
        if (c.mountedOnShaftId === shaft.id) return true;
        if (c.mountedOnShaftId !== undefined && c.mountedOnShaftId !== null) return false;
        return isCoaxialWithShaft(c, shaft) && isOnSameYLevel(c, shaft, (shaft.length || 1) / 2);
      })
      .map((c) => c.id);
    assemblies.set(shaft.id, [shaft.id, ...mounted]);
  });

  return assemblies;
};

export const areCoaxialSameShaft = (
  compAId: string,
  compBId: string,
  components: SceneComponent[]
): boolean => {
  const a = components.find((c) => c.id === compAId);
  const b = components.find((c) => c.id === compBId);
  if (!a || !b) return false;
  if (a.type === ComponentType.SHAFT || b.type === ComponentType.SHAFT) return false;
  const assemblies = detectShaftAssemblies(components);
  for (const [, memberIds] of assemblies) {
    if (memberIds.includes(compAId) && memberIds.includes(compBId)) return true;
  }
  return false;
};

export const detectGearConnections = (components: SceneComponent[]): GearConnection[] => {
  const gears = components.filter((c) => c.type === ComponentType.GEAR) as GearComponent[];
  const connections: GearConnection[] = [];
  const connected = new Set<string>();

  for (let i = 0; i < gears.length; i++) {
    for (let j = i + 1; j < gears.length; j++) {
      const gearA = gears[i];
      const gearB = gears[j];
      const pairKey = [gearA.id, gearB.id].sort().join('-');

      if (connected.has(pairKey)) continue;
      if (!isOnSameYLevel(gearA, gearB, 0.3)) continue;
      if (areCoaxialSameShaft(gearA.id, gearB.id, components)) continue;

      const distance = getXYPlaneDistance(gearA, gearB);
      const targetDistance = gearA.radius + gearB.radius;

      if (Math.abs(distance - targetDistance) < GEAR_MESH_TOLERANCE) {
        const ratio = gearB.teeth / gearA.teeth;
        connections.push({
          id: `gear-conn-${gearA.id}-${gearB.id}`,
          gearAId: gearA.id,
          gearBId: gearB.id,
          ratio,
        });
        connected.add(pairKey);
      }
    }
  }

  return connections;
};

export const detectBeltConnections = (
  components: SceneComponent[],
  manualBeltKeys: Set<string> = new Set(),
  deletedManualKeys: Set<string> = new Set()
): BeltConnection[] => {
  const pulleys = components.filter((c) => c.type === ComponentType.PULLEY) as PulleyComponent[];
  const connections: BeltConnection[] = [];
  const connected = new Set<string>();

  for (let i = 0; i < pulleys.length; i++) {
    for (let j = i + 1; j < pulleys.length; j++) {
      const pulleyA = pulleys[i];
      const pulleyB = pulleys[j];
      const pairKey = [pulleyA.id, pulleyB.id].sort().join('-');

      if (connected.has(pairKey)) continue;
      if (!isOnSameYLevel(pulleyA, pulleyB, 0.3)) continue;
      if (areCoaxialSameShaft(pulleyA.id, pulleyB.id, components)) continue;
      if (deletedManualKeys.has(pairKey)) continue;

      if (manualBeltKeys.has(pairKey)) {
        connections.push({
          id: `belt-${pulleyA.id}-${pulleyB.id}-manual`,
          fromPulleyId: pulleyA.id,
          toPulleyId: pulleyB.id,
          manual: true,
        });
        connected.add(pairKey);
        continue;
      }

      const distance = getXYPlaneDistance(pulleyA, pulleyB);
      const minDistance = pulleyA.radius + pulleyB.radius + 0.2;
      const maxDistance = (pulleyA.radius + pulleyB.radius) * 4;

      if (distance >= minDistance && distance <= maxDistance) {
        const ratio = Math.max(pulleyA.radius, pulleyB.radius) / Math.min(pulleyA.radius, pulleyB.radius);
        if (ratio >= 0.8 && ratio <= 3.0) {
          connections.push({
            id: `belt-${pulleyA.id}-${pulleyB.id}`,
            fromPulleyId: pulleyA.id,
            toPulleyId: pulleyB.id,
            manual: false,
          });
          connected.add(pairKey);
        }
      }
    }
  }

  return connections;
};

export const calculateTransmissionSpeeds = (
  components: SceneComponent[],
  gearConnections: GearConnection[],
  beltConnections: BeltConnection[]
): Map<string, { speed: number; direction: RotationDirection }> => {
  const result = new Map<string, { speed: number; direction: RotationDirection }>();
  const motors = components.filter((c) => c.type === ComponentType.MOTOR) as MotorComponent[];
  const shaftAssemblies = detectShaftAssemblies(components);

  motors.forEach((motor) => {
    result.set(motor.id, { speed: motor.speed, direction: motor.direction });
  });

  const adjacencyList = new Map<
    string,
    { targetId: string; type: 'gear' | 'belt' | 'coaxial'; ratio: number; flip: boolean }[]
  >();

  const addEdge = (
    from: string,
    to: string,
    type: 'gear' | 'belt' | 'coaxial',
    ratio: number,
    flip: boolean
  ) => {
    if (!adjacencyList.has(from)) adjacencyList.set(from, []);
    adjacencyList.get(from)!.push({ targetId: to, type, ratio, flip });
    if (!adjacencyList.has(to)) adjacencyList.set(to, []);
    adjacencyList.get(to)!.push({ targetId: from, type, ratio: 1 / ratio, flip });
  };

  gearConnections.forEach((conn) => {
    const gearA = components.find((c) => c.id === conn.gearAId) as GearComponent;
    const gearB = components.find((c) => c.id === conn.gearBId) as GearComponent;
    if (gearA && gearB) {
      addEdge(conn.gearAId, conn.gearBId, 'gear', gearA.teeth / gearB.teeth, true);
    }
  });

  beltConnections.forEach((conn) => {
    const pulleyA = components.find((c) => c.id === conn.fromPulleyId) as PulleyComponent;
    const pulleyB = components.find((c) => c.id === conn.toPulleyId) as PulleyComponent;
    if (pulleyA && pulleyB) {
      addEdge(conn.fromPulleyId, conn.toPulleyId, 'belt', pulleyA.radius / pulleyB.radius, false);
    }
  });

  shaftAssemblies.forEach((memberIds) => {
    if (memberIds.length <= 1) return;
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        addEdge(memberIds[i], memberIds[j], 'coaxial', 1, false);
      }
    }
  });

  motors.forEach((motor) => {
    const nearbyGears = (components.filter((c) => c.type === ComponentType.GEAR) as GearComponent[]).filter(
      (g) => isOnSameYLevel(motor, g, 0.5) && getXYPlaneDistance(motor, g) < 1.5
    );
    const nearbyPulleys = (components.filter((c) => c.type === ComponentType.PULLEY) as PulleyComponent[]).filter(
      (p) => isOnSameYLevel(motor, p, 0.5) && getXYPlaneDistance(motor, p) < 1.5
    );

    nearbyGears.forEach((g) => addEdge(motor.id, g.id, 'coaxial', 1, true));
    nearbyPulleys.forEach((p) => addEdge(motor.id, p.id, 'coaxial', 1, false));
  });

  const queue: string[] = [...motors.map((m) => m.id)];
  const visited = new Set<string>(queue);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentState = result.get(current);
    if (!currentState) continue;

    const neighbors = adjacencyList.get(current) || [];
    neighbors.forEach(({ targetId, ratio, flip }) => {
      const newSpeed = currentState.speed * ratio;
      const newDirection = (flip ? currentState.direction * -1 : currentState.direction) as RotationDirection;

      const existing = result.get(targetId);
      if (!existing || Math.abs(existing.speed) < Math.abs(newSpeed)) {
        result.set(targetId, { speed: newSpeed, direction: newDirection });
      }

      if (!visited.has(targetId)) {
        visited.add(targetId);
        queue.push(targetId);
      }
    });
  }

  return result;
};

export const getTransmissionChain = (
  startId: string,
  gearConnections: GearConnection[],
  beltConnections: BeltConnection[]
): string[] => {
  const chain: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [startId];

  const adjacencyList = new Map<string, string[]>();

  const addEdge = (a: string, b: string) => {
    if (!adjacencyList.has(a)) adjacencyList.set(a, []);
    adjacencyList.get(a)!.push(b);
    if (!adjacencyList.has(b)) adjacencyList.set(b, []);
    adjacencyList.get(b)!.push(a);
  };

  gearConnections.forEach((c) => addEdge(c.gearAId, c.gearBId));
  beltConnections.forEach((c) => addEdge(c.fromPulleyId, c.toPulleyId));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    chain.push(current);

    const neighbors = adjacencyList.get(current) || [];
    neighbors.forEach((n) => {
      if (!visited.has(n)) queue.push(n);
    });
  }

  return chain;
};

export interface TransmissionStage {
  fromComponentId: string;
  fromComponentType: ComponentType;
  fromComponentName: string;
  toComponentId: string;
  toComponentType: ComponentType;
  toComponentName: string;
  connectionType: 'gear' | 'belt' | 'motor-drive' | 'coaxial';
  ratio: number;
  directionChanges: boolean;
  inputSpeed: number;
  outputSpeed: number;
  isBroken?: boolean;
}

export interface TransmissionChainInfo {
  id: string;
  motorId: string;
  motorName: string;
  motorSpeed: number;
  motorDirection: RotationDirection;
  stages: TransmissionStage[];
  componentIds: string[];
  finalOutputComponentId: string | null;
  finalOutputSpeed: number;
  finalOutputDirection: RotationDirection;
  totalRatio: number;
  powerFlow: { componentId: string; speed: number; direction: RotationDirection; isBroken: boolean }[];
  hasBrokenChain: boolean;
}

const buildAdjacencyList = (
  components: SceneComponent[],
  gearConnections: GearConnection[],
  beltConnections: BeltConnection[],
  shaftAssemblies: Map<string, string[]>
) => {
  const adjacency = new Map<string, { targetId: string; type: 'gear' | 'belt' | 'coaxial'; ratio: number }[]>();

  const addEdge = (from: string, to: string, type: 'gear' | 'belt' | 'coaxial', ratio: number) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push({ targetId: to, type, ratio });
    if (!adjacency.has(to)) adjacency.set(to, []);
    adjacency.get(to)!.push({ targetId: from, type, ratio: 1 / ratio });
  };

  gearConnections.forEach((conn) => {
    const gearA = components.find((c) => c.id === conn.gearAId) as GearComponent;
    const gearB = components.find((c) => c.id === conn.gearBId) as GearComponent;
    if (gearA && gearB) {
      addEdge(conn.gearAId, conn.gearBId, 'gear', gearA.teeth / gearB.teeth);
    }
  });

  beltConnections.forEach((conn) => {
    const pulleyA = components.find((c) => c.id === conn.fromPulleyId) as PulleyComponent;
    const pulleyB = components.find((c) => c.id === conn.toPulleyId) as PulleyComponent;
    if (pulleyA && pulleyB) {
      addEdge(conn.fromPulleyId, conn.toPulleyId, 'belt', pulleyA.radius / pulleyB.radius);
    }
  });

  shaftAssemblies.forEach((memberIds) => {
    if (memberIds.length <= 1) return;
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        addEdge(memberIds[i], memberIds[j], 'coaxial', 1);
      }
    }
  });

  return adjacency;
};

const getComponentLabel = (c: SceneComponent): string => {
  const shortId = c.id.slice(0, 4);
  switch (c.type) {
    case ComponentType.MOTOR:
      return `电机-${shortId}`;
    case ComponentType.GEAR:
      return `齿轮-${(c as GearComponent).teeth}齿`;
    case ComponentType.PULLEY:
      return `皮带轮-${shortId}`;
    case ComponentType.SHAFT:
      return `轴-${shortId}`;
    default:
      return shortId;
  }
};

export const getAllTransmissionChains = (
  components: SceneComponent[],
  gearConnections: GearConnection[],
  beltConnections: BeltConnection[]
): TransmissionChainInfo[] => {
  const motors = components.filter((c) => c.type === ComponentType.MOTOR) as MotorComponent[];
  if (motors.length === 0) return [];

  const shaftAssemblies = detectShaftAssemblies(components);
  const adjacency = buildAdjacencyList(components, gearConnections, beltConnections, shaftAssemblies);
  const compMap = new Map(components.map((c) => [c.id, c]));
  const chains: TransmissionChainInfo[] = [];

  motors.forEach((motor, motorIdx) => {
    const stages: TransmissionStage[] = [];
    const chainComponentIds = new Set<string>([motor.id]);
    const powerFlow: TransmissionChainInfo['powerFlow'] = [
      { componentId: motor.id, speed: motor.speed, direction: motor.direction, isBroken: false },
    ];
    let hasBrokenChain = false;

    const queue: {
      id: string;
      speed: number;
      direction: RotationDirection;
      fromId?: string;
      fromType?: 'gear' | 'belt' | 'coaxial';
    }[] = [];

    const nearbyGears = (components.filter((c) => c.type === ComponentType.GEAR) as GearComponent[]).filter(
      (g) => isOnSameYLevel(motor, g, 0.5) && getXYPlaneDistance(motor, g) < 1.5
    );
    const nearbyPulleys = (components.filter((c) => c.type === ComponentType.PULLEY) as PulleyComponent[]).filter(
      (p) => isOnSameYLevel(motor, p, 0.5) && getXYPlaneDistance(motor, p) < 1.5
    );

    if (nearbyGears.length === 0 && nearbyPulleys.length === 0) {
      hasBrokenChain = true;
    }

    nearbyGears.forEach((g) => {
      queue.push({
        id: g.id,
        speed: motor.speed,
        direction: (motor.direction * -1) as RotationDirection,
        fromId: motor.id,
        fromType: 'coaxial',
      });
      stages.push({
        fromComponentId: motor.id,
        fromComponentType: ComponentType.MOTOR,
        fromComponentName: getComponentLabel(motor),
        toComponentId: g.id,
        toComponentType: ComponentType.GEAR,
        toComponentName: getComponentLabel(g),
        connectionType: 'motor-drive',
        ratio: 1,
        directionChanges: true,
        inputSpeed: motor.speed,
        outputSpeed: motor.speed,
      });
    });

    nearbyPulleys.forEach((p) => {
      queue.push({
        id: p.id,
        speed: motor.speed,
        direction: motor.direction,
        fromId: motor.id,
        fromType: 'coaxial',
      });
      stages.push({
        fromComponentId: motor.id,
        fromComponentType: ComponentType.MOTOR,
        fromComponentName: getComponentLabel(motor),
        toComponentId: p.id,
        toComponentType: ComponentType.PULLEY,
        toComponentName: getComponentLabel(p),
        connectionType: 'motor-drive',
        ratio: 1,
        directionChanges: false,
        inputSpeed: motor.speed,
        outputSpeed: motor.speed,
      });
    });

    const visited = new Map<string, { speed: number; direction: RotationDirection }>();
    visited.set(motor.id, { speed: motor.speed, direction: motor.direction });
    let lastComponentId: string | null = nearbyGears[0]?.id || nearbyPulleys[0]?.id || null;
    let lastSpeed = motor.speed;
    let lastDirection = motor.direction;
    let totalRatio = 1;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const existing = visited.get(current.id);
      if (existing && Math.abs(existing.speed) >= Math.abs(current.speed)) continue;
      visited.set(current.id, { speed: current.speed, direction: current.direction });
      chainComponentIds.add(current.id);

      if (current.fromId && current.fromType) {
        const fromComp = compMap.get(current.fromId);
        const toComp = compMap.get(current.id);
        const stageExists = stages.some(
          (s) => s.toComponentId === current.id && s.fromComponentId === current.fromId
        );
        if (fromComp && toComp && !stageExists) {
          const edge = (adjacency.get(current.fromId) || []).find((e) => e.targetId === current.id);
          const ratio = edge?.ratio || 1;
          totalRatio *= ratio;
        }
      }

      const flowIdx = powerFlow.findIndex((p) => p.componentId === current.id);
      if (flowIdx >= 0) {
        powerFlow[flowIdx] = { componentId: current.id, speed: current.speed, direction: current.direction, isBroken: false };
      } else {
        powerFlow.push({ componentId: current.id, speed: current.speed, direction: current.direction, isBroken: false });
      }

      lastComponentId = current.id;
      lastSpeed = current.speed;
      lastDirection = current.direction;

      const neighbors = adjacency.get(current.id) || [];
      neighbors.forEach(({ targetId, type, ratio }) => {
        if (!visited.has(targetId)) {
          const newSpeed = current.speed * ratio;
          const newDirection = (type === 'gear' ? current.direction * -1 : current.direction) as RotationDirection;
          queue.push({ id: targetId, speed: newSpeed, direction: newDirection, fromId: current.id, fromType: type });

          const fromComp = compMap.get(current.id);
          const toComp = compMap.get(targetId);
          if (fromComp && toComp) {
            const stageExists = stages.some(
              (s) => s.toComponentId === targetId && s.fromComponentId === current.id
            );
            if (!stageExists) {
              stages.push({
                fromComponentId: current.id,
                fromComponentType: fromComp.type,
                fromComponentName: getComponentLabel(fromComp),
                toComponentId: targetId,
                toComponentType: toComp.type,
                toComponentName: getComponentLabel(toComp),
                connectionType: type,
                ratio,
                directionChanges: type === 'gear',
                inputSpeed: current.speed,
                outputSpeed: newSpeed,
              });
            }
          }
        }
      });
    }

    if (chainComponentIds.size > 1) {
      chains.push({
        id: `chain-${motorIdx}`,
        motorId: motor.id,
        motorName: getComponentLabel(motor),
        motorSpeed: motor.speed,
        motorDirection: motor.direction,
        stages,
        componentIds: Array.from(chainComponentIds),
        finalOutputComponentId: lastComponentId,
        finalOutputSpeed: lastSpeed,
        finalOutputDirection: lastDirection,
        totalRatio,
        powerFlow,
        hasBrokenChain,
      });
    } else {
      chains.push({
        id: `chain-${motorIdx}`,
        motorId: motor.id,
        motorName: getComponentLabel(motor),
        motorSpeed: motor.speed,
        motorDirection: motor.direction,
        stages: [],
        componentIds: [motor.id],
        finalOutputComponentId: null,
        finalOutputSpeed: 0,
        finalOutputDirection: 1,
        totalRatio: 1,
        powerFlow,
        hasBrokenChain: true,
      });
    }
  });

  return chains;
};

export const computeMeasurements = (
  selectedComponentId: string | null,
  components: SceneComponent[]
): MeasurementPair[] => {
  if (!selectedComponentId) return [];
  const selected = components.find((c) => c.id === selectedComponentId);
  if (!selected) return [];

  const measurements: MeasurementPair[] = [];
  const selectedRadius = getComponentRadius(selected);

  components.forEach((other) => {
    if (other.id === selectedComponentId) return;

    const distance = getXYPlaneDistance(selected, other);
    const otherRadius = getComponentRadius(other);

    if (selected.type === ComponentType.GEAR && other.type === ComponentType.GEAR) {
      const target = selectedRadius + otherRadius;
      measurements.push({
        id: `meas-${selectedComponentId}-${other.id}`,
        componentAId: selectedComponentId,
        componentBId: other.id,
        type: 'gear-mesh',
        currentValue: distance,
        targetValue: target,
        deviation: distance - target,
      });
    } else if (selected.type === ComponentType.PULLEY && other.type === ComponentType.PULLEY) {
      const beltLength = 2 * distance + Math.PI * (selectedRadius + otherRadius) + Math.pow(otherRadius - selectedRadius, 2) / (4 * distance);
      measurements.push({
        id: `meas-${selectedComponentId}-${other.id}`,
        componentAId: selectedComponentId,
        componentBId: other.id,
        type: 'belt-length',
        currentValue: beltLength,
        targetValue: distance,
        deviation: distance - (selectedRadius + otherRadius + 0.5),
      });
    } else {
      measurements.push({
        id: `meas-${selectedComponentId}-${other.id}`,
        componentAId: selectedComponentId,
        componentBId: other.id,
        type: 'center-distance',
        currentValue: distance,
      });
    }
  });

  return measurements.sort((a, b) => a.currentValue - b.currentValue);
};

export const getSnappingSuggestions = (
  component: SceneComponent,
  components: SceneComponent[]
): SnappingSuggestion[] => {
  const suggestions: SnappingSuggestion[] = [];
  if (component.type === ComponentType.SHAFT) return suggestions;

  const compRadius = getComponentRadius(component);

  components.forEach((other) => {
    if (other.id === component.id) return;

    const dx = other.position.x - component.position.x;
    const dz = other.position.z - component.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < 0.001) return;

    if (component.type === ComponentType.GEAR && other.type === ComponentType.GEAR) {
      const otherGear = other as GearComponent;
      const targetDistance = compRadius + otherGear.radius;
      if (Math.abs(distance - targetDistance) < GEAR_SNAP_DISTANCE && distance > 0.1) {
        const nx = dx / distance;
        const nz = dz / distance;
        suggestions.push({
          targetComponentId: other.id,
          snapType: 'gear-mesh',
          targetPosition: {
            x: other.position.x - nx * targetDistance,
            y: other.position.y,
            z: other.position.z - nz * targetDistance,
          },
          distance: Math.abs(distance - targetDistance),
        });
      }
    }

    if (other.type === ComponentType.SHAFT) {
      if (distance < COAXIAL_TOLERANCE * 2) {
        suggestions.push({
          targetComponentId: other.id,
          snapType: 'coaxial',
          targetPosition: {
            x: other.position.x,
            y: component.position.y,
            z: other.position.z,
          },
          distance,
        });
      }
    }
  });

  return suggestions.sort((a, b) => a.distance - b.distance);
};

export const getBeltConnectionDistance = (
  pulleyA: PulleyComponent,
  pulleyB: PulleyComponent
): number => getXYPlaneDistance(pulleyA, pulleyB);
