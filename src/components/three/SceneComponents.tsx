import { useMemo } from 'react';
import * as THREE from 'three';
import type { SceneComponent } from '../../types';
import { ComponentType } from '../../types';
import { Gear3D } from './Gear3D';
import { Shaft3D } from './Shaft3D';
import { Pulley3D } from './Pulley3D';
import { Motor3D } from './Motor3D';
import { Belt3D } from './Belt3D';
import { SpeedLabel } from './SpeedLabel';
import { TorqueArrow } from './TorqueArrow';
import { TransformableComponent } from './TransformableComponent';
import { useSceneStore } from '../../store/useSceneStore';

export function SceneComponents() {
  const components = useSceneStore((s) => s.components);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);
  const selectedComponentId = useSceneStore((s) => s.selectedComponentId);
  const highlightedChain = useSceneStore((s) => s.highlightedChain);
  const isRunning = useSceneStore((s) => s.isRunning);
  const explosionView = useSceneStore((s) => s.explosionView);
  const explosionFactor = useSceneStore((s) => s.explosionFactor);

  const centerPoint = useMemo(() => {
    if (components.length === 0) return { x: 0, y: 0, z: 0 };
    const sum = components.reduce(
      (acc, c) => ({
        x: acc.x + c.position.x,
        y: acc.y + c.position.y,
        z: acc.z + c.position.z,
      }),
      { x: 0, y: 0, z: 0 }
    );
    return {
      x: sum.x / components.length,
      y: sum.y / components.length,
      z: sum.z / components.length,
    };
  }, [components]);

  const getExplosionOffset = (comp: SceneComponent) => {
    if (!explosionView) return { x: 0, y: 0, z: 0 };
    const factor = explosionFactor;
    return {
      x: (comp.position.x - centerPoint.x) * (factor - 1),
      y: (comp.position.y - centerPoint.y + 0.5) * (factor - 1) + (factor - 1) * 0.5,
      z: (comp.position.z - centerPoint.z) * (factor - 1),
    };
  };

  const renderComponent = (comp: SceneComponent) => {
    const isSelected = selectedComponentId === comp.id;
    const isHighlighted = highlightedChain.includes(comp.id);
    const offset = getExplosionOffset(comp);

    const adjustedComp = {
      ...comp,
      position: {
        x: comp.position.x + offset.x,
        y: comp.position.y + offset.y,
        z: comp.position.z + offset.z,
      },
    };

    let component3D: React.ReactNode = null;

    switch (comp.type) {
      case ComponentType.GEAR:
        component3D = <Gear3D component={adjustedComp as any} isSelected={isSelected} isHighlighted={isHighlighted} />;
        break;
      case ComponentType.SHAFT:
        component3D = <Shaft3D component={adjustedComp as any} isSelected={isSelected} isHighlighted={isHighlighted} />;
        break;
      case ComponentType.PULLEY:
        component3D = <Pulley3D component={adjustedComp as any} isSelected={isSelected} isHighlighted={isHighlighted} />;
        break;
      case ComponentType.MOTOR:
        component3D = <Motor3D component={adjustedComp as any} isSelected={isSelected} isHighlighted={isHighlighted} />;
        break;
    }

    return (
      <group key={comp.id}>
        <TransformableComponent component={comp}>
          {component3D}
        </TransformableComponent>
        {isRunning && <TorqueArrow component={adjustedComp as any} />}
        <SpeedLabel component={adjustedComp as any} showSpeed={isRunning} />
      </group>
    );
  };

  return (
    <group>
      {components.map(renderComponent)}
      {!explosionView &&
        beltConnections.map((conn) => (
          <Belt3D key={conn.id} connection={conn} components={components} />
        ))}
    </group>
  );
}
