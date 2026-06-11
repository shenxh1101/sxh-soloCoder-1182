import { Info, RotateCw, Move, Trash2, Zap } from 'lucide-react';
import { useSceneStore } from '../../store/useSceneStore';
import { ComponentType } from '../../types';
import type { SceneComponent, GearComponent, MotorComponent, PulleyComponent, ShaftComponent } from '../../types';

export function InfoPanel() {
  const selectedComponentId = useSceneStore((s) => s.selectedComponentId);
  const components = useSceneStore((s) => s.components);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);
  const removeComponent = useSceneStore((s) => s.removeComponent);
  const updateComponentProperty = useSceneStore((s) => s.updateComponentProperty);
  const selectComponent = useSceneStore((s) => s.selectComponent);
  const isRunning = useSceneStore((s) => s.isRunning);

  const selectedComponent = components.find((c) => c.id === selectedComponentId);

  const relatedConnections = () => {
    if (!selectedComponent) return [];
    const gearConns = gearConnections.filter(
      (c) => c.gearAId === selectedComponent.id || c.gearBId === selectedComponent.id
    );
    const beltConns = beltConnections.filter(
      (c) => c.fromPulleyId === selectedComponent.id || c.toPulleyId === selectedComponent.id
    );
    return [...gearConns, ...beltConns];
  };

  const getComponentTypeName = (type: ComponentType) => {
    switch (type) {
      case ComponentType.GEAR:
        return '齿轮';
      case ComponentType.PULLEY:
        return '皮带轮';
      case ComponentType.SHAFT:
        return '传动轴';
      case ComponentType.MOTOR:
        return '电机';
    }
  };

  const renderComponentDetails = (comp: SceneComponent) => {
    const details: { label: string; value: React.ReactNode }[] = [];

    if (comp.type === ComponentType.GEAR) {
      const gear = comp as GearComponent;
      details.push({ label: '齿数', value: <span className="font-mono">{gear.teeth}</span> });
      details.push({ label: '半径', value: <span className="font-mono">{gear.radius.toFixed(2)}</span> });
      details.push({ label: '厚度', value: <span className="font-mono">{gear.thickness.toFixed(2)}</span> });
      if (isRunning) {
        details.push({
          label: '当前转速',
          value: (
            <span className="font-mono text-green-400">
              {gear.currentSpeed.toFixed(1)} RPM {gear.direction === 1 ? '↻' : '↺'}
            </span>
          ),
        });
      }
    }

    if (comp.type === ComponentType.PULLEY) {
      const pulley = comp as PulleyComponent;
      details.push({ label: '半径', value: <span className="font-mono">{pulley.radius.toFixed(2)}</span> });
      details.push({ label: '厚度', value: <span className="font-mono">{pulley.thickness.toFixed(2)}</span> });
      if (isRunning) {
        details.push({
          label: '当前转速',
          value: (
            <span className="font-mono text-green-400">
              {pulley.currentSpeed.toFixed(1)} RPM {pulley.direction === 1 ? '↻' : '↺'}
            </span>
          ),
        });
      }
    }

    if (comp.type === ComponentType.SHAFT) {
      const shaft = comp as ShaftComponent;
      details.push({ label: '长度', value: <span className="font-mono">{shaft.length.toFixed(2)}</span> });
      details.push({ label: '半径', value: <span className="font-mono">{shaft.radius.toFixed(2)}</span> });
    }

    if (comp.type === ComponentType.MOTOR) {
      const motor = comp as MotorComponent;
      details.push({
        label: '设定转速',
        value: (
          <input
            type="number"
            value={motor.speed}
            onChange={(e) =>
              updateComponentProperty(comp.id, { speed: parseFloat(e.target.value) || 0 } as any)
            }
            disabled={isRunning}
            className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm font-mono text-slate-200 focus:outline-none focus:border-primary-500"
          />
        ),
      });
      details.push({
        label: '旋转方向',
        value: (
          <button
            onClick={() =>
              updateComponentProperty(comp.id, {
                direction: motor.direction === 1 ? -1 : 1,
              } as any)
            }
            disabled={isRunning}
            className="btn btn-secondary text-xs py-1 px-2"
          >
            <RotateCw className="w-3 h-3" />
            {motor.direction === 1 ? '顺时针 ↻' : '逆时针 ↺'}
          </button>
        ),
      });
      details.push({
        label: '状态',
        value: (
          <span className={`font-mono text-sm ${isRunning ? 'text-green-400' : 'text-slate-400'}`}>
            {isRunning && motor.running ? '运行中' : '已停止'}
          </span>
        ),
      });
    }

    return details;
  };

  if (!selectedComponent) {
    return (
      <div className="panel w-72 h-full flex flex-col">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary-400" />
            属性面板
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
          <Move className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">选择一个组件</p>
          <p className="text-xs mt-1">查看和编辑属性</p>
        </div>
      </div>
    );
  }

  const connections = relatedConnections();

  return (
    <div className="panel w-72 h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-primary-400" />
          属性面板
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <div>
            <div className="data-label mb-1">名称</div>
            <div className="data-value">{selectedComponent.name}</div>
          </div>
          <div>
            <div className="data-label mb-1">类型</div>
            <div className="data-value">{getComponentTypeName(selectedComponent.type)}</div>
          </div>
          <div>
            <div className="data-label mb-1">放置顺序</div>
            <div className="data-value">#{selectedComponent.orderIndex}</div>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            组件参数
          </h3>
          <div className="space-y-3">
            {renderComponentDetails(selectedComponent).map((item, idx) => (
              <div key={idx}>
                <div className="data-label mb-1">{item.label}</div>
                <div className="data-value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            位置 / 旋转
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis}>
                <div className="data-label mb-1 text-center">{axis.toUpperCase()}</div>
                <div className="data-value text-center">
                  {selectedComponent.position[axis].toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {connections.length > 0 && (
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              连接关系 ({connections.length})
            </h3>
            <div className="space-y-2">
              {connections.map((conn, idx) => {
                const isGear = 'gearAId' in conn;
                let otherId = '';
                if (isGear) {
                  otherId =
                    conn.gearAId === selectedComponent.id ? conn.gearBId : conn.gearAId;
                } else {
                  otherId =
                    conn.fromPulleyId === selectedComponent.id ? conn.toPulleyId : conn.fromPulleyId;
                }
                const otherComp = components.find((c) => c.id === otherId);
                return (
                  <button
                    key={idx}
                    onClick={() => selectComponent(otherId)}
                    className="w-full text-left p-2 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors"
                  >
                    <div className="text-xs text-primary-400 mb-0.5">
                      {isGear ? `齿轮啮合 ${(conn as any).ratio?.toFixed(2) || ''}` : '皮带连接'}
                    </div>
                    <div className="text-sm text-slate-200">{otherComp?.name || '未知'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={() => removeComponent(selectedComponent.id)}
          className="btn btn-danger w-full justify-center"
        >
          <Trash2 className="w-4 h-4" />
          删除组件
        </button>
      </div>
    </div>
  );
}
