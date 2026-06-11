import { useState } from 'react';
import {
  Info,
  RotateCw,
  Trash2,
  Zap,
  Link,
  GitBranch,
  Target,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Ruler,
  Magnet,
  AlertTriangle,
  Activity,
  Disc,
  Link2Off,
  BarChart2,
  CircleDot,
  Unlink,
} from 'lucide-react';
import { useSceneStore } from '../../store/useSceneStore';
import { ComponentType, COAXIAL_SNAP_TOLERANCE } from '../../types';
import type {
  SceneComponent,
  GearComponent,
  MotorComponent,
  PulleyComponent,
  ShaftComponent,
  MeasurementPair,
} from '../../types';
import {
  getAllTransmissionChains,
  getTransmissionChain,
  type TransmissionChainInfo,
  type TransmissionStage,
} from '../../engine/TransmissionEngine';
import { getComponentRadius } from '../../utils/geometry';

function getComponentTypeName(type: ComponentType) {
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
}

function renderComponentDetails(
  comp: SceneComponent,
  isRunning: boolean,
  updateComponentProperty: any
) {
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
}

function StatusBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
        ok ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-slate-500'}`} />
      {label}
    </span>
  );
}

function PropertiesTab() {
  const selectedComponentId = useSceneStore((s) => s.selectedComponentId);
  const components = useSceneStore((s) => s.components);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);
  const removeComponent = useSceneStore((s) => s.removeComponent);
  const updateComponentProperty = useSceneStore((s) => s.updateComponentProperty);
  const selectComponent = useSceneStore((s) => s.selectComponent);
  const isRunning = useSceneStore((s) => s.isRunning);
  const getShaftAssemblies = useSceneStore((s) => s.getShaftAssemblies);
  const unmountComponentFromShaft = useSceneStore((s) => s.unmountComponentFromShaft);

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

  const getShaftInfo = () => {
    if (!selectedComponent) return null;
    const assemblies = getShaftAssemblies();
    for (const [shaftId, memberIds] of assemblies) {
      if (memberIds.includes(selectedComponent.id) && selectedComponent.id !== shaftId) {
        const shaft = components.find((c) => c.id === shaftId);
        const members = memberIds.filter((id) => id !== selectedComponent.id && id !== shaftId);
        return { shaft, memberCount: members.length, shaftId };
      }
    }
    return null;
  };

  if (!selectedComponent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
        <Target className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">选择一个组件</p>
        <p className="text-xs mt-1">查看和编辑属性</p>
      </div>
    );
  }

  const connections = relatedConnections();
  const details = renderComponentDetails(selectedComponent, isRunning, updateComponentProperty);
  const shaftInfo = getShaftInfo();

  return (
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

      {shaftInfo && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
          <div className="text-xs text-cyan-300 font-medium mb-2 flex items-center gap-1.5">
            <CircleDot className="w-3.5 h-3.5" />
            同轴装配
          </div>
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => shaftInfo.shaft && selectComponent(shaftInfo.shaftId)}
              className="text-cyan-200 hover:text-cyan-100 underline underline-offset-2"
            >
              {shaftInfo.shaft?.name || '传动轴'}
            </button>
            <span className="text-cyan-400">+{shaftInfo.memberCount} 个组件</span>
          </div>
          {selectedComponent.mountedOnShaftId && (
            <button
              onClick={() => unmountComponentFromShaft(selectedComponent.id)}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10 rounded py-1 transition-colors"
            >
              <Unlink className="w-3 h-3" />
              从轴上卸下
            </button>
          )}
        </div>
      )}

      <div className="border-t border-slate-700 pt-4">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
          组件参数
        </h3>
        <div className="space-y-3">
          {details.map((item, idx) => (
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
              const isManual = (conn as any).manual;
              return (
                <button
                  key={idx}
                  onClick={() => selectComponent(otherId)}
                  className="w-full text-left p-2 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-primary-400 text-xs">
                      {isGear
                        ? `齿轮啮合 1:${(conn as any).ratio?.toFixed(2) || ''}`
                        : `皮带连接${isManual ? ' (手动)' : ''}`}
                    </span>
                    {isManual && (
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded">
                        手动
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-200">{otherComp?.name || '未知'}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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

function PowerFlowVisualizer({ chain }: { chain: TransmissionChainInfo }) {
  const setFocusComponentId = useSceneStore((s) => s.setFocusComponentId);
  const setHighlightedChain = useSceneStore((s) => s.setHighlightedChain);
  const getTransmissionChainFn = useSceneStore((s) => s.getTransmissionChain);
  const components = useSceneStore((s) => s.components);

  const handleClick = (id: string) => {
    setFocusComponentId(id);
    const chainIds = getTransmissionChainFn(id);
    setHighlightedChain(chainIds);
    setTimeout(() => setFocusComponentId(null), 2000);
  };

  return (
    <div className="space-y-1.5 p-3 bg-slate-900/60 rounded-lg border border-slate-700/50">
      <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
        <Activity className="w-3 h-3" />
        功率流
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {chain.powerFlow.map((node, idx) => {
          const comp = components.find((c) => c.id === node.componentId);
          const rpm = Math.abs(node.speed).toFixed(0);
          return (
            <div key={node.componentId} className="flex items-center">
              <button
                onClick={() => handleClick(node.componentId)}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  node.isBroken
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-green-500/15 text-green-300 border border-green-500/25 hover:bg-green-500/25'
                }`}
              >
                <div className="font-medium">{comp?.name?.slice(0, 10) || '?'}</div>
                <div className="font-mono text-[10px] opacity-80">
                  {rpm} RPM {node.direction === 1 ? '↻' : '↺'}
                </div>
              </button>
              {idx < chain.powerFlow.length - 1 && (
                <ArrowRight className="w-3 h-3 text-slate-500 mx-0.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StageRow({
  stage,
  onClickComponent,
}: {
  stage: TransmissionStage;
  onClickComponent: (id: string) => void;
}) {
  const typeLabel =
    stage.connectionType === 'gear'
      ? `齿轮 1:${stage.ratio.toFixed(2)}`
      : stage.connectionType === 'belt'
      ? `皮带 1:${stage.ratio.toFixed(2)}`
      : stage.connectionType === 'coaxial'
      ? '同轴 1:1'
      : '电机驱动';
  const typeColor =
    stage.connectionType === 'gear'
      ? 'text-orange-400'
      : stage.connectionType === 'belt'
      ? 'text-purple-400'
      : stage.connectionType === 'coaxial'
      ? 'text-cyan-400'
      : 'text-yellow-400';

  return (
    <div className="flex items-center gap-2 py-1.5 text-xs">
      <button
        onClick={() => onClickComponent(stage.fromComponentId)}
        className="px-2 py-1 bg-slate-700/50 rounded hover:bg-slate-600 transition-colors text-slate-200"
      >
        {stage.fromComponentName}
      </button>
      <div className="flex flex-col items-center">
        <ArrowRight className="w-3 h-3 text-slate-500" />
        <span className={`text-[10px] ${typeColor}`}>{typeLabel}</span>
        <span className="text-[10px] text-slate-500">
          {stage.inputSpeed.toFixed(0)} → {stage.outputSpeed.toFixed(0)}
        </span>
        {stage.directionChanges && (
          <span className="text-[10px] text-orange-400 flex items-center gap-0.5">
            <RotateCcw className="w-2.5 h-2.5" />
            反向
          </span>
        )}
      </div>
      <button
        onClick={() => onClickComponent(stage.toComponentId)}
        className="px-2 py-1 bg-slate-700/50 rounded hover:bg-slate-600 transition-colors text-slate-200"
      >
        {stage.toComponentName}
      </button>
    </div>
  );
}

function ChainCard({ chain }: { chain: TransmissionChainInfo }) {
  const [expanded, setExpanded] = useState(true);
  const selectedChainId = useSceneStore((s) => s.selectedChainId);
  const setSelectedChainId = useSceneStore((s) => s.setSelectedChainId);
  const setFocusComponentId = useSceneStore((s) => s.setFocusComponentId);
  const setHighlightedChain = useSceneStore((s) => s.setHighlightedChain);
  const getTransmissionChainFn = useSceneStore((s) => s.getTransmissionChain);
  const isSelected = selectedChainId === chain.id;

  const handleClickComponent = (id: string) => {
    setFocusComponentId(id);
    const chainIds = getTransmissionChainFn(id);
    setHighlightedChain(chainIds);
    setTimeout(() => setFocusComponentId(null), 2000);
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${
        isSelected
          ? 'border-primary-500 bg-primary-500/5'
          : 'border-slate-700 bg-slate-800/30'
      }`}
    >
      <button
        onClick={() => {
          setExpanded(!expanded);
          setSelectedChainId(isSelected ? null : chain.id);
          setHighlightedChain(chain.componentIds);
        }}
        className="w-full p-3 flex items-center gap-2 hover:bg-slate-700/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
        <Zap className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-medium text-slate-200 text-left flex-1">
          {chain.motorName}
        </span>
        <span className="text-xs text-slate-500">{chain.motorSpeed} RPM</span>
        <span className="text-xs text-slate-500">{chain.motorDirection === 1 ? '↻' : '↺'}</span>
        <div className="flex-1" />
        {chain.hasBrokenChain && (
          <span className="text-[10px] text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3" />
            断链
          </span>
        )}
        <span className="text-xs text-slate-400">{chain.stages.length} 级</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <PowerFlowVisualizer chain={chain} />

          <div className="flex items-center justify-between text-xs bg-slate-900/50 rounded p-2">
            <span className="text-slate-400 flex items-center gap-1">
              <BarChart2 className="w-3 h-3" />
              总传动比:
            </span>
            <span className="font-mono text-primary-400">1 : {chain.totalRatio.toFixed(3)}</span>
          </div>

          <div className="flex items-center justify-between text-xs bg-slate-900/50 rounded p-2">
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              最终输出:
            </span>
            <span
              className={`font-mono ${
                chain.finalOutputSpeed === 0 ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {chain.finalOutputSpeed.toFixed(1)} RPM{' '}
              {chain.finalOutputDirection === 1 ? '↻' : '↺'}
            </span>
          </div>

          {chain.stages.length > 0 && (
            <div className="border-t border-slate-700 pt-2 space-y-1">
              <div className="text-xs text-slate-400 mb-1">传动链路:</div>
              {chain.stages.map((stage, idx) => (
                <StageRow
                  key={idx}
                  stage={stage}
                  onClickComponent={handleClickComponent}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MeasurementRow({
  measurement,
  components,
}: {
  measurement: MeasurementPair;
  components: SceneComponent[];
}) {
  const setFocusComponentId = useSceneStore((s) => s.setFocusComponentId);
  const setHighlightedChain = useSceneStore((s) => s.setHighlightedChain);
  const getTransmissionChainFn = useSceneStore((s) => s.getTransmissionChain);
  const snapNearestGearMesh = useSceneStore((s) => s.snapNearestGearMesh);
  const snapNearestCoaxial = useSceneStore((s) => s.snapNearestCoaxial);

  const other = components.find((c) => c.id === measurement.componentBId);
  const handleFocus = () => {
    setFocusComponentId(measurement.componentBId);
    const chainIds = getTransmissionChainFn(measurement.componentBId);
    setHighlightedChain(chainIds);
    setTimeout(() => setFocusComponentId(null), 2000);
  };

  let typeLabel = '';
  let typeColor = 'text-slate-400';
  let showSnap = false;
  let snapType: 'gear' | 'coaxial' | null = null;
  let deviationText = '';
  let deviationColor = '';

  switch (measurement.type) {
    case 'gear-mesh':
      typeLabel = '齿轮啮合';
      typeColor = 'text-orange-400';
      showSnap = true;
      snapType = 'gear';
      break;
    case 'belt-length':
      typeLabel = '皮带周长';
      typeColor = 'text-purple-400';
      break;
    default:
      typeLabel = '中心距';
  }

  if (measurement.deviation !== undefined) {
    const abs = Math.abs(measurement.deviation);
    if (measurement.type === 'gear-mesh') {
      if (abs < 0.05) {
        deviationText = '✓ 已啮合';
        deviationColor = 'text-green-400';
      } else if (abs < 0.2) {
        deviationText = `${measurement.deviation > 0 ? '+' : ''}${measurement.deviation.toFixed(2)}`;
        deviationColor = 'text-yellow-400';
      } else {
        deviationText = `${measurement.deviation > 0 ? '+' : ''}${measurement.deviation.toFixed(2)}`;
        deviationColor = 'text-slate-400';
      }
    } else {
      deviationText = `${measurement.deviation > 0 ? '+' : ''}${measurement.deviation.toFixed(2)}`;
      deviationColor = 'text-slate-400';
    }
  }

  return (
    <div className="p-2 bg-slate-700/30 rounded text-xs space-y-1.5">
      <div className="flex items-center justify-between">
        <button
          onClick={handleFocus}
          className="text-slate-200 hover:text-slate-100 font-medium text-left"
        >
          → {other?.name || '?'}
        </button>
        <span className={`text-[10px] ${typeColor}`}>{typeLabel}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-[11px]">
          {measurement.type === 'gear-mesh' && measurement.targetValue !== undefined
            ? `目标: ${measurement.targetValue.toFixed(2)}`
            : measurement.type === 'belt-length'
            ? `轮距: ${measurement.targetValue?.toFixed(2)}`
            : ''}
        </span>
        <div className="flex items-center gap-2">
          <span className={`font-mono ${deviationColor || 'text-slate-200'}`}>
            {measurement.currentValue.toFixed(2)}
          </span>
          {deviationText && <span className={`text-[10px] ${deviationColor}`}>{deviationText}</span>}
        </div>
      </div>
      {showSnap && snapType === 'gear' && (
        <button
          onClick={() => snapNearestGearMesh(measurement.componentAId)}
          disabled={Math.abs(measurement.deviation || 0) < 0.01 || Math.abs(measurement.deviation || 0) > 1.5}
          className="w-full mt-1 flex items-center justify-center gap-1 py-1 text-[10px] bg-orange-500/15 text-orange-300 hover:bg-orange-500/25 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Magnet className="w-3 h-3" />
          吸附到相切
        </button>
      )}
    </div>
  );
}

function TransmissionTab() {
  const components = useSceneStore((s) => s.components);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);
  const isRunning = useSceneStore((s) => s.isRunning);
  const setFocusComponentId = useSceneStore((s) => s.setFocusComponentId);
  const setHighlightedChain = useSceneStore((s) => s.setHighlightedChain);
  const connectionEditMode = useSceneStore((s) => s.connectionEditMode);
  const pendingShaftSelection = useSceneStore((s) => s.pendingShaftSelection);
  const measurements = useSceneStore((s) => s.measurements);
  const snappingSuggestions = useSceneStore((s) => s.snappingSuggestions);
  const selectedComponentId = useSceneStore((s) => s.selectedComponentId);
  const snapComponentToSuggestion = useSceneStore((s) => s.snapComponentToSuggestion);
  const getShaftAssemblies = useSceneStore((s) => s.getShaftAssemblies);

  const chains = getAllTransmissionChains(components, gearConnections, beltConnections);

  const connectedIds = new Set<string>();
  gearConnections.forEach((gc) => {
    connectedIds.add(gc.gearAId);
    connectedIds.add(gc.gearBId);
  });
  beltConnections.forEach((bc) => {
    connectedIds.add(bc.fromPulleyId);
    connectedIds.add(bc.toPulleyId);
  });
  const motors = components.filter((c) => c.type === ComponentType.MOTOR);
  motors.forEach((m) => {
    const nearby = components
      .filter((c) => c.type === ComponentType.GEAR || c.type === ComponentType.PULLEY)
      .filter((c) => {
        const dx = c.position.x - m.position.x;
        const dz = c.position.z - m.position.z;
        return Math.sqrt(dx * dx + dz * dz) < 1.5;
      });
    nearby.forEach((n) => connectedIds.add(n.id));
    connectedIds.add(m.id);
  });

  const unconnectedComponents = components.filter((c) => !connectedIds.has(c.id));

  const handleClickComponent = (id: string) => {
    setFocusComponentId(id);
    const chain = getTransmissionChain(id, gearConnections, beltConnections);
    setHighlightedChain(chain);
    setTimeout(() => setFocusComponentId(null), 2000);
  };

  const shaftAssemblies = getShaftAssemblies();
  const activeAssemblies = Array.from(shaftAssemblies.entries()).filter(
    ([, ids]) => ids.length > 1
  );

  if (connectionEditMode === 'belt') {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <div className="text-sm font-medium text-purple-300 flex items-center gap-2 mb-1">
            <Link className="w-4 h-4" />
            皮带编辑模式
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>1. 点击第一个皮带轮选中它</p>
            <p>2. 点击第二个皮带轮创建或删除皮带连接</p>
            <p>3. 手动连接的皮带不受自动检测影响</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            现有皮带连接 ({beltConnections.length})
          </div>
          {beltConnections.length === 0 ? (
            <div className="text-sm text-slate-500 py-2">暂无皮带连接</div>
          ) : (
            beltConnections.map((bc) => {
              const a = components.find((c) => c.id === bc.fromPulleyId);
              const b = components.find((c) => c.id === bc.toPulleyId);
              return (
                <div
                  key={bc.id}
                  className="flex items-center gap-2 p-2 bg-slate-700/30 rounded text-xs"
                >
                  <button
                    onClick={() => handleClickComponent(bc.fromPulleyId)}
                    className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600"
                  >
                    {a?.name || bc.fromPulleyId.slice(0, 4)}
                  </button>
                  <ArrowRight className="w-3 h-3 text-purple-400" />
                  <button
                    onClick={() => handleClickComponent(bc.toPulleyId)}
                    className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600"
                  >
                    {b?.name || bc.toPulleyId.slice(0, 4)}
                  </button>
                  {bc.manual && (
                    <span className="ml-auto text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                      手动
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (connectionEditMode === 'shaft') {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
          <div className="text-sm font-medium text-cyan-300 flex items-center gap-2 mb-1">
            <CircleDot className="w-4 h-4" />
            同轴装配模式
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>1. 先点击一根传动轴或一个组件</p>
            <p>2. 再点击要装配的组件/轴</p>
            <p>3. 同轴的组件将同速同向转动</p>
          </div>
          {pendingShaftSelection && (
            <div className="mt-2 pt-2 border-t border-cyan-500/20 text-xs text-cyan-200">
              已选中:{' '}
              {components.find((c) => c.id === pendingShaftSelection)?.name || '?'}
              <span className="text-slate-400 ml-2">(再次点击取消)</span>
            </div>
          )}
        </div>

        {activeAssemblies.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              现有同轴装配 ({activeAssemblies.length})
            </div>
            {activeAssemblies.map(([shaftId, memberIds]) => {
              const shaft = components.find((c) => c.id === shaftId);
              const members = memberIds.filter((id) => id !== shaftId);
              return (
                <div
                  key={shaftId}
                  className="p-2 bg-slate-700/30 rounded space-y-1.5"
                >
                  <button
                    onClick={() => handleClickComponent(shaftId)}
                    className="w-full text-left text-xs font-medium text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5"
                  >
                    <CircleDot className="w-3 h-3" />
                    {shaft?.name || '轴'}
                  </button>
                  <div className="flex flex-wrap gap-1.5 pl-5">
                    {members.map((mid) => {
                      const mc = components.find((c) => c.id === mid);
                      return (
                        <button
                          key={mid}
                          onClick={() => handleClickComponent(mid)}
                          className="px-2 py-0.5 text-[11px] bg-slate-700 rounded hover:bg-slate-600 text-slate-200"
                        >
                          {mc?.name || '?'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!isRunning) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
          <div className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" />
            连接状态预览
          </div>
          <div className="text-xs text-slate-400 mb-3">
            启动仿真后将按以下连接关系传动
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">
                齿轮啮合: {gearConnections.length}
              </div>
              {gearConnections.length === 0 ? (
                <div className="text-xs text-slate-600">暂无</div>
              ) : (
                <div className="space-y-1">
                  {gearConnections.map((gc) => {
                    const a = components.find((c) => c.id === gc.gearAId);
                    const b = components.find((c) => c.id === gc.gearBId);
                    return (
                      <div
                        key={gc.id}
                        className="flex items-center gap-2 text-xs p-1.5 bg-slate-800/50 rounded"
                      >
                        <button
                          onClick={() => handleClickComponent(gc.gearAId)}
                          className="text-primary-300 hover:text-primary-200"
                        >
                          {a?.name || '?'}
                        </button>
                        <span className="text-slate-500">⚙</span>
                        <button
                          onClick={() => handleClickComponent(gc.gearBId)}
                          className="text-primary-300 hover:text-primary-200"
                        >
                          {b?.name || '?'}
                        </button>
                        <span className="text-slate-500 ml-auto">
                          1:{gc.ratio.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">
                皮带连接: {beltConnections.length}
              </div>
              {beltConnections.length === 0 ? (
                <div className="text-xs text-slate-600">暂无</div>
              ) : (
                <div className="space-y-1">
                  {beltConnections.map((bc) => {
                    const a = components.find((c) => c.id === bc.fromPulleyId);
                    const b = components.find((c) => c.id === bc.toPulleyId);
                    return (
                      <div
                        key={bc.id}
                        className="flex items-center gap-2 text-xs p-1.5 bg-slate-800/50 rounded"
                      >
                        <button
                          onClick={() => handleClickComponent(bc.fromPulleyId)}
                          className="text-purple-300 hover:text-purple-200"
                        >
                          {a?.name || '?'}
                        </button>
                        <span className="text-slate-500">～</span>
                        <button
                          onClick={() => handleClickComponent(bc.toPulleyId)}
                          className="text-purple-300 hover:text-purple-200"
                        >
                          {b?.name || '?'}
                        </button>
                        {bc.manual && (
                          <span className="ml-auto text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                            手动
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {activeAssemblies.length > 0 && (
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
            <div className="text-sm font-medium text-cyan-300 flex items-center gap-2 mb-2">
              <CircleDot className="w-4 h-4" />
              同轴装配 ({activeAssemblies.length})
            </div>
            <div className="space-y-2">
              {activeAssemblies.map(([shaftId, memberIds]) => {
                const shaft = components.find((c) => c.id === shaftId);
                const members = memberIds.filter((id) => id !== shaftId);
                return (
                  <div key={shaftId} className="text-xs">
                    <button
                      onClick={() => handleClickComponent(shaftId)}
                      className="text-cyan-200 hover:text-cyan-100"
                    >
                      {shaft?.name}
                    </button>
                    <span className="text-slate-500 mx-1">+{members.length}</span>
                    <div className="flex flex-wrap gap-1 mt-1 ml-3">
                      {members.map((mid) => {
                        const mc = components.find((c) => c.id === mid);
                        return (
                          <button
                            key={mid}
                            onClick={() => handleClickComponent(mid)}
                            className="px-1.5 py-0.5 bg-slate-700/50 rounded text-[10px] text-slate-300 hover:bg-slate-600"
                          >
                            {mc?.name?.slice(0, 8) || '?'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedComponentId && measurements.length > 0 && (
          <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
            <div className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
              <Ruler className="w-4 h-4" />
              测量工具
            </div>
            <div className="text-xs text-slate-400 mb-2">
              选中: {components.find((c) => c.id === selectedComponentId)?.name}
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {measurements.slice(0, 10).map((m) => (
                <MeasurementRow key={m.id} measurement={m} components={components} />
              ))}
            </div>
          </div>
        )}

        {selectedComponentId && snappingSuggestions.length > 0 && (
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
            <div className="text-sm font-medium text-orange-300 flex items-center gap-2 mb-2">
              <Magnet className="w-4 h-4" />
              吸附建议
            </div>
            <div className="space-y-1.5">
              {snappingSuggestions.slice(0, 5).map((s, idx) => {
                const target = components.find((c) => c.id === s.targetComponentId);
                return (
                  <button
                    key={idx}
                    onClick={() => snapComponentToSuggestion(selectedComponentId, s)}
                    className="w-full flex items-center justify-between text-xs p-2 bg-slate-700/30 rounded hover:bg-slate-700/60 transition-colors text-left"
                  >
                    <div>
                      <div className="text-slate-200 font-medium">
                        {s.snapType === 'gear-mesh'
                          ? `与 ${target?.name} 相切`
                          : `与 ${target?.name} 同轴`}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        偏移: {s.distance.toFixed(2)}
                      </div>
                    </div>
                    <Magnet className="w-3.5 h-3.5 text-orange-400" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {unconnectedComponents.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 bg-slate-500 rounded-full" />
              未接入传动链 ({unconnectedComponents.length})
            </div>
            <div className="space-y-1">
              {unconnectedComponents.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleClickComponent(c.id)}
                  className="w-full flex items-center gap-2 p-2 bg-slate-700/30 rounded text-xs hover:bg-slate-700/50 transition-colors"
                >
                  <StatusBadge ok={false} label="未接入" />
                  <span className="text-slate-300">{c.name}</span>
                  <span className="text-slate-500 ml-auto">
                    {getComponentTypeName(c.type)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {motors.length === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-300">
            ⚠️ 场景中还没有电机，无法进行仿真
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-green-400" />
          传动链分析
        </h3>
        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
          运行中
        </span>
      </div>

      {chains.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无有效传动链</p>
          <p className="text-xs mt-1">检查电机是否靠近齿轮或皮带轮</p>
        </div>
      ) : (
        chains.map((chain) => <ChainCard key={chain.id} chain={chain} />)
      )}

      {selectedComponentId && measurements.length > 0 && (
        <div className="mt-4 border-t border-slate-700 pt-3 space-y-2">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5" />
            实时测量
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {measurements
              .filter((m) => m.type !== 'center-distance')
              .slice(0, 6)
              .map((m) => (
                <MeasurementRow key={m.id} measurement={m} components={components} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function InfoPanel() {
  const [activeTab, setActiveTab] = useState<'properties' | 'transmission'>('properties');

  return (
    <div className="panel w-80 h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-1">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'properties'
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          属性
        </button>
        <button
          onClick={() => setActiveTab('transmission')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === 'transmission'
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          传动链
        </button>
      </div>

      {activeTab === 'properties' ? <PropertiesTab /> : <TransmissionTab />}
    </div>
  );
}
