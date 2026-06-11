import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { SceneComponent } from '../../types';
import { ComponentType, COAXIAL_SNAP_TOLERANCE } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { TransformableComponent } from './TransformableComponent';
import { Gear3D } from './Gear3D';
import { Shaft3D } from './Shaft3D';
import { Pulley3D } from './Pulley3D';
import { Motor3D } from './Motor3D';
import { Belt3D } from './Belt3D';
import { SpeedLabel } from './SpeedLabel';
import { TorqueArrow } from './TorqueArrow';
import { getTransmissionChain, computeMeasurements, getSnappingSuggestions } from '../../engine/TransmissionEngine';

const GEAR_MESH_PREVIEW_TOLERANCE = 0.5;
const MAX_MEASUREMENT_LINES = 6;

const getExplosionOffset = (
  component: SceneComponent,
  center: { x: number; z: number },
  factor: number
) => {
  const dx = component.position.x - center.x;
  const dz = component.position.z - center.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.001) return { x: 0, y: 0, z: 0 };
  const offsetDist = dist * factor;
  return {
    x: (dx / dist) * offsetDist,
    y: offsetDist * 0.3,
    z: (dz / dist) * offsetDist,
  };
};

function RenderComponent({ component, showMeshPreview, isBeltEditTarget, isShaftEditTarget }: {
  component: SceneComponent;
  showMeshPreview: boolean;
  isBeltEditTarget: boolean;
  isShaftEditTarget: boolean;
}) {
  const selectedComponentId = useSceneStore((s) => s.selectedComponentId);
  const highlightedChain = useSceneStore((s) => s.highlightedChain);
  const isRunning = useSceneStore((s) => s.isRunning);
  const connectionEditMode = useSceneStore((s) => s.connectionEditMode);
  const pendingBeltSelection = useSceneStore((s) => s.pendingBeltSelection);
  const pendingShaftSelection = useSceneStore((s) => s.pendingShaftSelection);
  const focusComponentId = useSceneStore((s) => s.focusComponentId);

  const isSelected = selectedComponentId === component.id;
  const isHighlighted = highlightedChain.includes(component.id);
  const isFocused = focusComponentId === component.id;
  const isPendingBelt = pendingBeltSelection === component.id;
  const isPendingShaft = pendingShaftSelection === component.id;
  const isMountedOnShaft = !!(component as any).mountedOnShaftId;

  const commonProps = {
    isSelected,
    isHighlighted,
    isFocused,
    isMountedOnShaft,
    isShaftEditTarget,
    isPendingShaft,
  };

  let content: React.ReactNode = null;
  switch (component.type) {
    case ComponentType.GEAR:
      content = (
        <Gear3D
          component={component}
          {...commonProps}
          showMeshPreview={showMeshPreview}
          isPendingBelt={isPendingBelt}
          isBeltEditTarget={isBeltEditTarget}
        />
      );
      break;
    case ComponentType.SHAFT:
      content = <Shaft3D component={component} {...commonProps} />;
      break;
    case ComponentType.PULLEY:
      content = (
        <Pulley3D
          component={component}
          {...commonProps}
          isPendingBelt={isPendingBelt}
          isBeltEditTarget={isBeltEditTarget}
        />
      );
      break;
    case ComponentType.MOTOR:
      content = <Motor3D component={component} {...commonProps} />;
      break;
  }

  const showLabels = isRunning && (component.type === ComponentType.GEAR || component.type === ComponentType.PULLEY);
  const labelHeight = component.type === ComponentType.MOTOR ? 1.5 : (component as any).thickness || 1;

  return (
    <TransformableComponent component={component} isSelected={isSelected}>
      {content}
      {showLabels && (
        <>
          <group position={[0, labelHeight + 0.3, 0]}>
            <SpeedLabel component={component} />
          </group>
          <group position={[0, labelHeight + 0.6, 0]}>
            <TorqueArrow component={component} />
          </group>
        </>
      )}
    </TransformableComponent>
  );
}

function MeshPreviewIndicator({ gearA, gearB }: { gearA: SceneComponent; gearB: SceneComponent }) {
  const dx = gearB.position.x - gearA.position.x;
  const dz = gearB.position.z - gearA.position.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  if (distance < 0.001) return null;

  const midX = (gearA.position.x + gearB.position.x) / 2;
  const midZ = (gearA.position.z + gearB.position.z) / 2;
  const angle = Math.atan2(dz, dx);

  return (
    <group position={[midX, 0.1, midZ]} rotation={[0, -angle, 0]}>
      <mesh>
        <cylinderGeometry args={[0.03, 0.03, distance, 8]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function ConnectionStatusOverlay({ component, isConnected }: { component: SceneComponent; isConnected: boolean }) {
  const isRunning = useSceneStore((s) => s.isRunning);
  const selectedComponentId = useSceneStore((s) => s.selectedComponentId);
  if (isRunning) return null;
  if (selectedComponentId !== component.id) return null;

  return (
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.02, 0.08, 16]} />
      <meshBasicMaterial
        color={isConnected ? '#22c55e' : '#94a3b8'}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function MeasurementIndicator({ measurement, compA, compB }: {
  measurement: any;
  compA: SceneComponent;
  compB: SceneComponent;
}) {
  const dx = compB.position.x - compA.position.x;
  const dz = compB.position.z - compA.position.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  if (distance < 0.001) return null;

  const midX = (compA.position.x + compB.position.x) / 2;
  const midZ = (compA.position.z + compB.position.z) / 2;
  const angle = Math.atan2(dz, dx);

  let lineColor = '#94a3b8';
  let labelColor = '#cbd5e1';
  if (measurement.type === 'gear-mesh') {
    if (measurement.deviation !== undefined && Math.abs(measurement.deviation) < 0.05) {
      lineColor = '#22c55e';
      labelColor = '#4ade80';
    } else if (measurement.deviation !== undefined && Math.abs(measurement.deviation) < 0.3) {
      lineColor = '#f59e0b';
      labelColor = '#fbbf24';
    }
  } else if (measurement.type === 'coaxial' || measurement.type === 'center-distance') {
    if (measurement.deviation !== undefined && Math.abs(measurement.deviation) < COAXIAL_SNAP_TOLERANCE) {
      lineColor = '#06b6d4';
      labelColor = '#22d3ee';
    }
  }

  const labelText = measurement.type === 'gear-mesh'
    ? `啮合: ${measurement.currentValue.toFixed(2)}m (目标${measurement.targetValue?.toFixed(2)}m, 偏差${measurement.deviation !== undefined ? (measurement.deviation >= 0 ? '+' : '') + measurement.deviation.toFixed(2) : ''}m)`
    : measurement.type === 'belt-length'
    ? `皮带长: ~${measurement.currentValue.toFixed(2)}m`
    : `中心距: ${measurement.currentValue.toFixed(2)}m`;

  return (
    <group>
      <group position={[midX, 0.15, midZ]} rotation={[0, -angle, 0]}>
        <mesh>
          <cylinderGeometry args={[0.015, 0.015, distance, 6]} />
          <meshBasicMaterial color={lineColor} transparent opacity={0.6} />
        </mesh>
      </group>
      <group position={[compA.position.x, 0.2, compA.position.z]}>
        <mesh>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      </group>
      <group position={[compB.position.x, 0.2, compB.position.z]}>
        <mesh>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      </group>
      <Html position={[midX, 0.5, midZ]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            color: labelColor,
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            border: `1px solid ${lineColor}66`,
          }}
        >
          {labelText}
        </div>
      </Html>
    </group>
  );
}

function SnappingPreviewIndicator({ suggestion, targetComponent }: {
  suggestion: any;
  targetComponent: SceneComponent;
}) {
  const tp = suggestion.targetPosition;
  const isGearMesh = suggestion.snapType === 'gear-mesh';
  const isCoaxial = suggestion.snapType === 'coaxial';

  const color = isGearMesh ? '#22c55e' : isCoaxial ? '#06b6d4' : '#a855f7';
  const radius = (targetComponent as any).radius || 0.5;

  return (
    <group position={[tp.x, tp.y, tp.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius + 0.05, radius + 0.12, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius + 0.15, radius + 0.16, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.04, 0.6, 0.04]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.04, 0.6, 0.04]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.04, 0.6, 0.04]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      <Html position={[0, radius + 0.4, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            background: color + '22',
            color: color,
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'system-ui',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            border: `1px solid ${color}88`,
          }}
        >
          {isGearMesh ? '◎ 吸附到相切啮合' : isCoaxial ? '⦿ 吸附到同轴装配' : '◆ 吸附目标位置'}
          <span style={{ opacity: 0.7, marginLeft: 6, fontWeight: 400 }}>
            距离 {suggestion.distance.toFixed(2)}m
          </span>
        </div>
      </Html>
    </group>
  );
}

export function SceneComponents() {
  const components = useSceneStore((s) => s.components);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);
  const explosionView = useSceneStore((s) => s.explosionView);
  const explosionFactor = useSceneStore((s) => s.explosionFactor);
  const pendingBeltSelection = useSceneStore((s) => s.pendingBeltSelection);
  const pendingShaftSelection = useSceneStore((s) => s.pendingShaftSelection);
  const connectionEditMode = useSceneStore((s) => s.connectionEditMode);
  const selectedComponentId = useSceneStore((s) => s.selectedComponentId);
  const isRunning = useSceneStore((s) => s.isRunning);
  const snappingSuggestions = useSceneStore((s) => s.snappingSuggestions);
  const measurements = useSceneStore((s) => s.measurements);

  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    gearConnections.forEach((gc) => {
      ids.add(gc.gearAId);
      ids.add(gc.gearBId);
    });
    beltConnections.forEach((bc) => {
      ids.add(bc.fromPulleyId);
      ids.add(bc.toPulleyId);
    });
    return ids;
  }, [gearConnections, beltConnections]);

  const previewMeshPairs = useMemo(() => {
    if (isRunning) return [];
    const gears = components.filter((c) => c.type === ComponentType.GEAR);
    const pairs: [SceneComponent, SceneComponent][] = [];
    for (let i = 0; i < gears.length; i++) {
      for (let j = i + 1; j < gears.length; j++) {
        const dx = gears[i].position.x - gears[j].position.x;
        const dz = gears[i].position.z - gears[j].position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const rA = (gears[i] as any).radius;
        const rB = (gears[j] as any).radius;
        const target = rA + rB;
        if (Math.abs(distance - target) < GEAR_MESH_PREVIEW_TOLERANCE && distance > target) {
          pairs.push([gears[i], gears[j]]);
        }
      }
    }
    return pairs;
  }, [components, isRunning]);

  const gearsWithMeshPreview = useMemo(() => {
    const ids = new Set<string>();
    previewMeshPairs.forEach(([a, b]) => {
      ids.add(a.id);
      ids.add(b.id);
    });
    return ids;
  }, [previewMeshPairs]);

  const beltEditTargetIds = useMemo(() => {
    if (pendingBeltSelection === null) return new Set<string>();
    const ids = new Set<string>();
    components.forEach((c) => {
      if (c.type === ComponentType.PULLEY && c.id !== pendingBeltSelection) {
        ids.add(c.id);
      }
    });
    return ids;
  }, [pendingBeltSelection, components]);

  const shaftEditTargetIds = useMemo(() => {
    if (pendingShaftSelection === null) return new Set<string>();
    const pendingComp = components.find((c) => c.id === pendingShaftSelection);
    if (!pendingComp) return new Set<string>();
    const ids = new Set<string>();
    if (pendingComp.type === ComponentType.SHAFT) {
      components.forEach((c) => {
        if (c.type !== ComponentType.SHAFT && c.id !== pendingShaftSelection && !(c as any).mountedOnShaftId) {
          ids.add(c.id);
        }
      });
    } else {
      components.forEach((c) => {
        if (c.type === ComponentType.SHAFT && (c as any).mountedOnShaftId !== pendingShaftSelection) {
          ids.add(c.id);
        }
      });
    }
    return ids;
  }, [pendingShaftSelection, components]);

  const selectedMeasurements = useMemo(() => {
    if (!selectedComponentId || isRunning) return [];
    if (measurements.length > 0) {
      return measurements.slice(0, MAX_MEASUREMENT_LINES);
    }
    const calced = computeMeasurements(selectedComponentId, components);
    return calced.slice(0, MAX_MEASUREMENT_LINES);
  }, [selectedComponentId, components, measurements, isRunning]);

  const activeSnappingSuggestions = useMemo(() => {
    if (isRunning) return [];
    if (snappingSuggestions.length > 0) return snappingSuggestions;
    if (!selectedComponentId) return [];
    const selComp = components.find((c) => c.id === selectedComponentId);
    if (!selComp) return [];
    return getSnappingSuggestions(selComp, components);
  }, [selectedComponentId, components, snappingSuggestions, isRunning]);

  const explosionCenter = useMemo(() => {
    if (components.length === 0) return { x: 0, z: 0 };
    let sumX = 0, sumZ = 0;
    components.forEach((c) => {
      sumX += c.position.x;
      sumZ += c.position.z;
    });
    return { x: sumX / components.length, z: sumZ / components.length };
  }, [components]);

  return (
    <group>
      {components.map((component) => {
        let effectiveComponent = component;
        if (explosionView) {
          const offset = getExplosionOffset(component, explosionCenter, explosionFactor);
          effectiveComponent = {
            ...component,
            position: {
              x: component.position.x + offset.x,
              y: component.position.y + offset.y,
              z: component.position.z + offset.z,
            },
          };
        }

        return (
          <group key={component.id}>
            <RenderComponent
              component={effectiveComponent}
              showMeshPreview={gearsWithMeshPreview.has(component.id)}
              isBeltEditTarget={beltEditTargetIds.has(component.id)}
              isShaftEditTarget={shaftEditTargetIds.has(component.id)}
            />
            <ConnectionStatusOverlay
              component={effectiveComponent}
              isConnected={connectedIds.has(component.id)}
            />
          </group>
        );
      })}

      {beltConnections.map((conn) => (
        <Belt3D key={`${conn.fromPulleyId}-${conn.toPulleyId}`} connection={conn} components={components} />
      ))}

      {previewMeshPairs.map(([a, b], idx) => (
        <MeshPreviewIndicator key={`preview-${idx}`} gearA={a} gearB={b} />
      ))}

      {selectedMeasurements.map((m) => {
        const compA = components.find((c) => c.id === m.componentAId);
        const compB = components.find((c) => c.id === m.componentBId);
        if (!compA || !compB) return null;
        return (
          <MeasurementIndicator key={m.id} measurement={m} compA={compA} compB={compB} />
        );
      })}

      {activeSnappingSuggestions.map((s) => {
        const targetComp = components.find((c) => c.id === s.targetComponentId);
        if (!targetComp) return null;
        return (
          <SnappingPreviewIndicator key={`snap-${s.snapType}-${s.targetComponentId}`} suggestion={s} targetComponent={targetComp} />
        );
      })}
    </group>
  );
}
