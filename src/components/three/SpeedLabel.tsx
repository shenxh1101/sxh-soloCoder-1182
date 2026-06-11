import { Html } from '@react-three/drei';
import type { SceneComponent } from '../../types';
import { ComponentType } from '../../types';

interface SpeedLabelProps {
  component: SceneComponent;
  showSpeed?: boolean;
}

export function SpeedLabel({ component, showSpeed = true }: SpeedLabelProps) {
  if (component.type === ComponentType.SHAFT) return null;

  const speed = (component as any).currentSpeed || 0;
  const direction = (component as any).direction || 1;
  const directionText = direction === 1 ? '↻' : '↺';

  const labelText = speed > 0 ? `${speed.toFixed(1)} RPM ${directionText}` : component.name;

  return (
    <Html
      position={[component.position.x, component.position.y + 1.5, component.position.z]}
      center
      distanceFactor={10}
      style={{
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.9)',
          color: '#e2e8f0',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(100, 116, 139, 0.5)',
          backdropFilter: 'blur(4px)',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: '9px', marginBottom: '2px' }}>
          {component.name}
        </div>
        {showSpeed && (
          <div style={{ color: speed > 0 ? '#22c55e' : '#64748b', fontWeight: 600 }}>
            {labelText}
          </div>
        )}
      </div>
    </Html>
  );
}
