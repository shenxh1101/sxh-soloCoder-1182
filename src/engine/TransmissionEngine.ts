import type { SceneComponent, GearComponent, PulleyComponent, MotorComponent, GearConnection, BeltConnection, RotationDirection } from '../types';
import { ComponentType } from '../types';
import { getComponentRadius, getXYPlaneDistance, isOnSameYLevel } from '../utils/geometry';

const GEAR_MESH_TOLERANCE = 0.15;
const BELT_CONNECT_TOLERANCE = 0.3;

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

export const detectBeltConnections = (components: SceneComponent[]): BeltConnection[] => {
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

      const distance = getXYPlaneDistance(pulleyA, pulleyB);
      const minDist = pulleyA.radius + pulleyB.radius + 0.2;
      const maxDist = pulleyA.radius + pulleyB.radius + 4.0;

      if (distance > minDist && distance < maxDist) {
        connections.push({
          id: `belt-conn-${pulleyA.id}-${pulleyB.id}`,
          fromPulleyId: pulleyA.id,
          toPulleyId: pulleyB.id,
        });
        connected.add(pairKey);
      }
    }
  }

  return connections;
};

interface SpeedInfo {
  speed: number;
  direction: RotationDirection;
}

export const calculateTransmissionSpeeds = (
  components: SceneComponent[],
  gearConnections: GearConnection[],
  beltConnections: BeltConnection[]
): Map<string, SpeedInfo> => {
  const speeds = new Map<string, SpeedInfo>();
  const motors = components.filter((c) => c.type === ComponentType.MOTOR) as MotorComponent[];

  if (motors.length === 0) return speeds;

  const adjacencyList = new Map<string, { targetId: string; type: 'gear' | 'belt'; ratio: number }[]>();

  const addEdge = (from: string, to: string, type: 'gear' | 'belt', ratio: number) => {
    if (!adjacencyList.has(from)) adjacencyList.set(from, []);
    adjacencyList.get(from)!.push({ targetId: to, type, ratio });
    if (!adjacencyList.has(to)) adjacencyList.set(to, []);
    adjacencyList.get(to)!.push({ targetId: from, type, ratio: 1 / ratio });
  };

  gearConnections.forEach((conn) => {
    const gearA = components.find((c) => c.id === conn.gearAId) as GearComponent;
    const gearB = components.find((c) => c.id === conn.gearBId) as GearComponent;
    if (gearA && gearB) {
      const ratio = gearA.teeth / gearB.teeth;
      addEdge(conn.gearAId, conn.gearBId, 'gear', ratio);
    }
  });

  beltConnections.forEach((conn) => {
    const pulleyA = components.find((c) => c.id === conn.fromPulleyId) as PulleyComponent;
    const pulleyB = components.find((c) => c.id === conn.toPulleyId) as PulleyComponent;
    if (pulleyA && pulleyB) {
      const ratio = pulleyA.radius / pulleyB.radius;
      addEdge(conn.fromPulleyId, conn.toPulleyId, 'belt', ratio);
    }
  });

  motors.forEach((motor) => {
    const queue: { id: string; speed: number; direction: RotationDirection; fromType?: 'gear' | 'belt' }[] = [];

    const nearbyGears = (components.filter((c) => c.type === ComponentType.GEAR) as GearComponent[]).filter(
      (g) => isOnSameYLevel(motor, g, 0.5) && getXYPlaneDistance(motor, g) < 1.5
    );

    const nearbyPulleys = (components.filter((c) => c.type === ComponentType.PULLEY) as PulleyComponent[]).filter(
      (p) => isOnSameYLevel(motor, p, 0.5) && getXYPlaneDistance(motor, p) < 1.5
    );

    nearbyGears.forEach((g) => {
      queue.push({ id: g.id, speed: motor.speed, direction: (motor.direction * -1) as RotationDirection });
    });

    nearbyPulleys.forEach((p) => {
      queue.push({ id: p.id, speed: motor.speed, direction: motor.direction });
    });

    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const existing = speeds.get(current.id);
      if (!existing || Math.abs(current.speed) > Math.abs(existing.speed)) {
        speeds.set(current.id, { speed: current.speed, direction: current.direction });
      }

      const neighbors = adjacencyList.get(current.id) || [];
      neighbors.forEach(({ targetId, type, ratio }) => {
        if (!visited.has(targetId)) {
          const newSpeed = current.speed * ratio;
          const newDirection = (type === 'gear' ? current.direction * -1 : current.direction) as RotationDirection;
          queue.push({ id: targetId, speed: newSpeed, direction: newDirection, fromType: type });
        }
      });
    }
  });

  return speeds;
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
  connectionType: 'gear' | 'belt' | 'motor-drive';
  ratio: number;
  directionChanges: boolean;
  inputSpeed: number;
  outputSpeed: number;
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
}

const buildAdjacencyList = (
  components: SceneComponent[],
  gearConnections: GearConnection[],
  beltConnections: BeltConnection[]
) => {
  const adjacency = new Map<string, { targetId: string; type: 'gear' | 'belt'; ratio: number }[]>();

  const addEdge = (from: string, to: string, type: 'gear' | 'belt', ratio: number) => {
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

  const adjacency = buildAdjacencyList(components, gearConnections, beltConnections);
  const compMap = new Map(components.map((c) => [c.id, c]));
  const chains: TransmissionChainInfo[] = [];

  motors.forEach((motor, motorIdx) => {
    const stages: TransmissionStage[] = [];
    const chainComponentIds = new Set<string>([motor.id]);

    const queue: {
      id: string;
      speed: number;
      direction: RotationDirection;
      fromId?: string;
      fromType?: 'gear' | 'belt';
    }[] = [];

    const nearbyGears = (components.filter((c) => c.type === ComponentType.GEAR) as GearComponent[]).filter(
      (g) => isOnSameYLevel(motor, g, 0.5) && getXYPlaneDistance(motor, g) < 1.5
    );

    const nearbyPulleys = (components.filter((c) => c.type === ComponentType.PULLEY) as PulleyComponent[]).filter(
      (p) => isOnSameYLevel(motor, p, 0.5) && getXYPlaneDistance(motor, p) < 1.5
    );

    nearbyGears.forEach((g) => {
      queue.push({
        id: g.id,
        speed: motor.speed,
        direction: (motor.direction * -1) as RotationDirection,
        fromId: motor.id,
        fromType: 'gear',
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
        fromType: 'belt',
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
    let lastComponentId: string | null = null;
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
        if (fromComp && toComp && current.fromType !== 'gear' || !stages.some(
          (s) => s.toComponentId === current.id && s.fromComponentId === current.fromId
        )) {
          const fromSpeed = visited.get(current.fromId)?.speed || motor.speed;
          totalRatio *= (current.fromType === 'gear' || current.fromType === 'belt')
            ? (adjacency.get(current.fromId) || []).find((e) => e.targetId === current.id)?.ratio || 1
            : 1;
        }
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
      });
    }
  });

  return chains;
};
