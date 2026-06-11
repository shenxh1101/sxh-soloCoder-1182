import { useMemo } from 'react';
import type { SceneComponent } from '../../types';
import { ComponentType } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { TransformableComponent } from './TransformableComponent';
import { Gear3D } from './Gear3D';
import { Shaft3D } from './Shaft3D';
import { Pulley3D } from './Pulley3D';
import { Motor3D } from './Motor3D';
import { Belt3D } from './Belt3D';
import { SpeedLabel } from './SpeedLabel';
import { TorqueArrow } from './TorqueArrow';
import { getTransmissionChain, detectGearConnections } from '../../engine/TransmissionEngine';

const GEAR_MESH_PREVIEW_TOLERANCE = 0.5;

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

function RenderComponent({ component, showMeshPreview, isBeltEditTarget }: {
  component: SceneComponent;
  showMeshPreview: boolean;
  isBeltEditTarget: boolean;
}) {
  const selectedComponentId = useSceneStore((s) => s.selectedComponentId);
  const highlightedChain = useSceneStore((s) => s.highlightedChain);
  const isRunning = useSceneStore((s) => s.isRunning);
  const connectionEditMode = useSceneStore((s) => s.connectionEditMode);
  const pendingBeltSelection = useSceneStore((s) => s.pendingBeltSelection);
  const focusComponentId = useSceneStore((s) => s.focusComponentId);

  const isSelected = selectedComponentId === component.id;
  const isHighlighted = highlightedChain.includes(component.id);
  const isFocused = focusComponentId === component.id;
  const isPendingBelt = pendingBeltSelection === component.id;

  const commonProps = {
    isSelected,
    isHighlighted,
    isFocused,
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

export function SceneComponents() {
  const components = useSceneStore((s) => s.components);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);
  const explosionView = useSceneStore((s) => s.explosionView);
  const explosionFactor = useSceneStore((s) => s.explosionFactor);
  const pendingBeltSelection = useSceneStore((s) => s.pendingBeltSelection);
  const isRunning = useSceneStore((s) => s.isRunning);

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
    </group>
  );
}
