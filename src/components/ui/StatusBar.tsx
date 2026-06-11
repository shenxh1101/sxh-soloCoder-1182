import { Info, CheckCircle, AlertCircle } from 'lucide-react';
import { useSceneStore } from '../../store/useSceneStore';
import { ComponentType } from '../../types';

export function StatusBar() {
  const isRunning = useSceneStore((s) => s.isRunning);
  const components = useSceneStore((s) => s.components);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);
  const selectedComponentId = useSceneStore((s) => s.selectedComponentId);
  const draggingPreset = useSceneStore((s) => s.draggingPreset);
  const explosionView = useSceneStore((s) => s.explosionView);
  const background = useSceneStore((s) => s.background);

  const selectedComponent = components.find((c) => c.id === selectedComponentId);
  const motorCount = components.filter((c) => c.type === ComponentType.MOTOR).length;
  const hasMotor = motorCount > 0;

  return (
    <div className="panel px-4 py-1.5 flex items-center gap-4 text-xs">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <CheckCircle className="w-3.5 h-3.5 text-green-400 animate-pulse" />
        ) : hasMotor ? (
          <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span className={isRunning ? 'text-green-400' : 'text-slate-400'}>
          {isRunning
            ? '模拟运行中'
            : hasMotor
            ? '系统就绪 - 点击启动'
            : '未检测到电机 - 请添加电机组件'}
        </span>
      </div>

      <div className="h-4 w-px bg-slate-700" />

      <div className="flex items-center gap-1 text-slate-400">
        <Info className="w-3 h-3" />
        {draggingPreset ? (
          <span className="text-primary-400">
            正在放置: <span className="font-medium">{draggingPreset.label}</span> - 点击场景放置或按 ESC 取消
          </span>
        ) : selectedComponent ? (
          <span>
            已选中: <span className="text-slate-200 font-medium">{selectedComponent.name}</span>
            <span className="text-slate-500 ml-1">
              (G 移动 | R 旋转 | Delete 删除)
            </span>
          </span>
        ) : (
          <span>点击组件库选择，或点击场景中的组件进行选择</span>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-4 text-slate-500">
        <span>
          齿轮: <span className="text-slate-300 font-mono">{components.filter((c) => c.type === ComponentType.GEAR).length}</span>
        </span>
        <span>
          皮带轮: <span className="text-slate-300 font-mono">{components.filter((c) => c.type === ComponentType.PULLEY).length}</span>
        </span>
        <span>
          传动: <span className="text-slate-300 font-mono">{gearConnections.length + beltConnections.length}</span>
        </span>
        {explosionView && (
          <span className="text-accent-400">爆炸视图</span>
        )}
        {background === 'blueprint' && (
          <span className="text-blue-300">工程图模式</span>
        )}
        {background === 'transparent' && (
          <span className="text-purple-300">透明背景</span>
        )}
      </div>
    </div>
  );
}
