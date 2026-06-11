import { useState } from 'react';
import { Info, RotateCw, Move, Trash2, Zap, Link, GitBranch, Target, ChevronDown, ChevronRight, ArrowRight, RotateCcw } from 'lucide-react';
import { useSceneStore } from '../../store/useSceneStore';
import { ComponentType } from '../../types';
import type { SceneComponent, GearComponent, MotorComponent, PulleyComponent, ShaftComponent } from '../../types';
import { getAllTransmissionChains, getTransmissionChain, type TransmissionChainInfo, type TransmissionStage } from '../../engine/TransmissionEngine';

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

function renderComponentDetails(comp: SceneComponent, isRunning: boolean, updateComponentProperty: any) {
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

function PropertiesTab() {
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

  if (!selectedComponent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
        <Move className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">选择一个组件</p>
        <p className="text-xs mt-1">查看和编辑属性</p>
      </div>
    );
  }

  const connections = relatedConnections();
  const details = renderComponentDetails(selectedComponent, isRunning, updateComponentProperty);

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

function ConnectionStatusBadge({ isConnected }: { isConnected: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
      isConnected ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-slate-500'}`} />
      {isConnected ? '已连接' : '未接入'}
    </span>
  );
}

function StageRow({ stage, onClickComponent }: { stage: TransmissionStage; onClickComponent: (id: string) => void }) {
  const connectionLabel = stage.connectionType === 'gear'
    ? `齿轮啮合 1:${stage.ratio.toFixed(2)}`
    : stage.connectionType === 'belt'
    ? `皮带传动 1:${stage.ratio.toFixed(2)}`
    : '电机驱动';

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
        <span className={`text-[10px] ${stage.directionChanges ? 'text-orange-400' : 'text-slate-500'}`}>
          {connectionLabel}
        </span>
        <span className="text-[10px] text-slate-500">
          {stage.inputSpeed.toFixed(0)} → {stage.outputSpeed.toFixed(0)} RPM
        </span>
        {stage.directionChanges && (
          <span className="text-[10px] text-orange-400 flex items-center gap-0.5">
            <RotateCcw className="w-2.5 h-2.5" />反向
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

function ChainCard({ chain, onClickComponent }: { chain: TransmissionChainInfo; onClickComponent: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-2 hover:bg-slate-700/30 transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        <Zap className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-medium text-slate-200">{chain.motorName}</span>
        <span className="text-xs text-slate-500">{chain.motorSpeed} RPM</span>
        <span className="text-xs text-slate-500">{chain.motorDirection === 1 ? '↻' : '↺'}</span>
        <div className="flex-1" />
        <span className="text-xs text-slate-400">{chain.stages.length} 级传动</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center justify-between text-xs bg-slate-900/50 rounded p-2">
            <span className="text-slate-400">总传动比:</span>
            <span className="font-mono text-primary-400">1 : {chain.totalRatio.toFixed(3)}</span>
          </div>

          <div className="flex items-center justify-between text-xs bg-slate-900/50 rounded p-2">
            <span className="text-slate-400">最终输出:</span>
            <span className="font-mono text-green-400">
              {chain.finalOutputSpeed.toFixed(1)} RPM {chain.finalOutputDirection === 1 ? '↻' : '↺'}
            </span>
          </div>

          <div className="border-t border-slate-700 pt-2 space-y-1">
            <div className="text-xs text-slate-400 mb-1">传动链路:</div>
            {chain.stages.map((stage, idx) => (
              <StageRow key={idx} stage={stage} onClickComponent={onClickComponent} />
            ))}
          </div>
        </div>
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

  const chains = getAllTransmissionChains(components, gearConnections, beltConnections);

  const connectedIds = new Set<string>();
  gearConnections.forEach((gc) => { connectedIds.add(gc.gearAId); connectedIds.add(gc.gearBId); });
  beltConnections.forEach((bc) => { connectedIds.add(bc.fromPulleyId); connectedIds.add(bc.toPulleyId); });
  const motors = components.filter((c) => c.type === ComponentType.MOTOR);
  motors.forEach((m) => {
    const nearby = components.filter((c) =>
      c.type === ComponentType.GEAR || c.type === ComponentType.PULLEY
    ).filter((c) => {
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
            <p>3. 再次点击同一个皮带轮可取消选择</p>
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
                <div key={bc.id} className="flex items-center gap-2 p-2 bg-slate-700/30 rounded text-xs">
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
                </div>
              );
            })
          )}
        </div>
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
              <div className="text-xs text-slate-400 mb-1">齿轮啮合: {gearConnections.length}</div>
              {gearConnections.length === 0 ? (
                <div className="text-xs text-slate-600">暂无</div>
              ) : (
                <div className="space-y-1">
                  {gearConnections.map((gc) => {
                    const a = components.find((c) => c.id === gc.gearAId);
                    const b = components.find((c) => c.id === gc.gearBId);
                    return (
                      <div key={gc.id} className="flex items-center gap-2 text-xs p-1.5 bg-slate-800/50 rounded">
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
                        <span className="text-slate-500 ml-auto">1:{gc.ratio.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">皮带连接: {beltConnections.length}</div>
              {beltConnections.length === 0 ? (
                <div className="text-xs text-slate-600">暂无</div>
              ) : (
                <div className="space-y-1">
                  {beltConnections.map((bc) => {
                    const a = components.find((c) => c.id === bc.fromPulleyId);
                    const b = components.find((c) => c.id === bc.toPulleyId);
                    return (
                      <div key={bc.id} className="flex items-center gap-2 text-xs p-1.5 bg-slate-800/50 rounded">
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

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
                  <ConnectionStatusBadge isConnected={false} />
                  <span className="text-slate-300">{c.name}</span>
                  <span className="text-slate-500 ml-auto">{getComponentTypeName(c.type)}</span>
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
        chains.map((chain) => (
          <ChainCard key={chain.id} chain={chain} onClickComponent={handleClickComponent} />
        ))
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
