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
