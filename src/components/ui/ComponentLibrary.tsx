import { useState } from 'react';
import { Settings, Minus, Disc, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import type { ComponentPreset } from '../../types';
import { GEAR_PRESETS, PULLEY_PRESETS, SHAFT_PRESETS, MOTOR_PRESETS, ComponentType } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';

const categoryConfig = [
  { key: 'gears', label: '齿轮', icon: Settings, presets: GEAR_PRESETS },
  { key: 'pulleys', label: '皮带轮', icon: Disc, presets: PULLEY_PRESETS },
  { key: 'shafts', label: '传动轴', icon: Minus, presets: SHAFT_PRESETS },
  { key: 'motors', label: '电机', icon: Zap, presets: MOTOR_PRESETS },
];

const typeColors: Record<ComponentType, string> = {
  [ComponentType.GEAR]: 'from-slate-600 to-slate-500',
  [ComponentType.PULLEY]: 'from-purple-600 to-purple-500',
  [ComponentType.SHAFT]: 'from-slate-500 to-slate-400',
  [ComponentType.MOTOR]: 'from-red-600 to-red-500',
};

export function ComponentLibrary() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['gears', 'motors']);
  const setDraggingPreset = useSceneStore((s) => s.setDraggingPreset);

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleDragStart = (preset: ComponentPreset, e: React.DragEvent) => {
    setDraggingPreset(preset);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', preset.name);
  };

  const handleDragEnd = () => {
    // DragPlane handles placement, we just keep preset state until drop
  };

  const handleMouseDown = (preset: ComponentPreset) => {
    setDraggingPreset(preset);
  };

  const renderPresetIcon = (preset: ComponentPreset) => {
    const colorClass = typeColors[preset.type];

    if (preset.type === ComponentType.GEAR) {
      const teeth = (preset.defaultProps as any).teeth || 20;
      return (
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center relative`}>
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-white/90">
            <g fill="currentColor">
              {Array.from({ length: Math.min(teeth, 16) }).map((_, i) => {
                const angle = (i * 360) / Math.min(teeth, 16);
                return (
                  <rect
                    key={i}
                    x="28"
                    y="4"
                    width="8"
                    height="12"
                    rx="2"
                    transform={`rotate(${angle} 32 32)`}
                  />
                );
              })}
              <circle cx="32" cy="32" r="18" />
              <circle cx="32" cy="32" r="6" fill="#1e293b" />
            </g>
          </svg>
        </div>
      );
    }

    if (preset.type === ComponentType.PULLEY) {
      return (
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
          <div className="w-10 h-10 rounded-full border-4 border-white/80 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white/60" />
          </div>
        </div>
      );
    }

    if (preset.type === ComponentType.SHAFT) {
      return (
        <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
          <div className="w-2 h-10 rounded-full bg-white/80" />
        </div>
      );
    }

    if (preset.type === ComponentType.MOTOR) {
      return (
        <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
          <Zap className="w-7 h-7 text-white" fill="currentColor" />
        </div>
      );
    }

    return <div className={`w-14 h-14 rounded bg-gradient-to-br ${colorClass}`} />;
  };

  return (
    <div className="panel w-64 h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary-400" />
          组件库
        </h2>
        <p className="text-xs text-slate-400 mt-1">拖拽或点击组件到场景</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {categoryConfig.map((category) => {
          const isExpanded = expandedCategories.includes(category.key);
          const Icon = category.icon;

          return (
            <div key={category.key} className="rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category.key)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-300" />
                  <span className="text-sm font-medium text-slate-200">{category.label}</span>
                  <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
                    {category.presets.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="p-2 grid grid-cols-2 gap-2">
                  {category.presets.map((preset) => (
                    <div
                      key={preset.name}
                      className="component-card"
                      draggable
                      onDragStart={(e) => handleDragStart(preset, e)}
                      onDragEnd={handleDragEnd}
                      onMouseDown={() => handleMouseDown(preset)}
                    >
                      {renderPresetIcon(preset)}
                      <span className="text-xs text-slate-300 text-center leading-tight">
                        {preset.label}
                      </span>
                      {preset.type === ComponentType.GEAR && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(preset.defaultProps as any).teeth}T / {(preset.defaultProps as any).radius?.toFixed(1) || '1.0'}
                        </span>
                      )}
                      {preset.type === ComponentType.MOTOR && (
                        <span className="text-[10px] text-red-400 font-mono">
                          {(preset.defaultProps as any).speed} RPM
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-slate-700 bg-slate-800/50">
        <div className="text-[10px] text-slate-500 space-y-0.5">
          <div>• 拖拽组件到场景放置</div>
          <div>• G键移动 / R键旋转</div>
          <div>• Delete键删除选中</div>
        </div>
      </div>
    </div>
  );
}
