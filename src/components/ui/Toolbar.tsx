import { useRef } from 'react';
import {
  Play,
  Square,
  Download,
  Upload,
  Image,
  Trash2,
  LayoutGrid,
  Sun,
  Moon,
  Layers,
  Maximize2,
  Highlighter,
} from 'lucide-react';
import { useSceneStore } from '../../store/useSceneStore';
import {
  saveSceneToJSON,
  loadSceneFromJSON,
  exportStepsImage,
  exportSceneImage,
} from '../../utils/exportUtils';
import type { BackgroundType } from '../../types';

export function Toolbar({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const isRunning = useSceneStore((s) => s.isRunning);
  const toggleRunning = useSceneStore((s) => s.toggleRunning);
  const components = useSceneStore((s) => s.components);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);
  const clearScene = useSceneStore((s) => s.clearScene);
  const loadScene = useSceneStore((s) => s.loadScene);
  const background = useSceneStore((s) => s.background);
  const setBackground = useSceneStore((s) => s.setBackground);
  const explosionView = useSceneStore((s) => s.explosionView);
  const toggleExplosionView = useSceneStore((s) => s.toggleExplosionView);
  const explosionFactor = useSceneStore((s) => s.explosionFactor);
  const setExplosionFactor = useSceneStore((s) => s.setExplosionFactor);
  const setHighlightedChain = useSceneStore((s) => s.setHighlightedChain);
  const highlightedChain = useSceneStore((s) => s.highlightedChain);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    saveSceneToJSON(components, gearConnections, beltConnections);
  };

  const handleLoad = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const data = await loadSceneFromJSON(file);
        loadScene(data);
      } catch (err) {
        console.error('加载失败:', err);
        alert('加载文件失败，请检查文件格式');
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportSteps = () => {
    if (components.length === 0) {
      alert('没有组件可导出');
      return;
    }
    if (canvasRef.current) {
      exportStepsImage(components, canvasRef.current);
    }
  };

  const handleExportImage = () => {
    if (canvasRef.current) {
      exportSceneImage(canvasRef.current);
    }
  };

  const cycleBackground = () => {
    const backgrounds: BackgroundType[] = ['dark', 'blueprint', 'transparent'];
    const currentIndex = backgrounds.indexOf(background);
    const nextIndex = (currentIndex + 1) % backgrounds.length;
    setBackground(backgrounds[nextIndex]);
  };

  const getBackgroundIcon = () => {
    switch (background) {
      case 'blueprint':
        return <LayoutGrid className="w-4 h-4" />;
      case 'transparent':
        return <Layers className="w-4 h-4" />;
      default:
        return <Moon className="w-4 h-4" />;
    }
  };

  const getBackgroundLabel = () => {
    switch (background) {
      case 'blueprint':
        return '工程图';
      case 'transparent':
        return '透明';
      default:
        return '深色';
    }
  };

  const toggleHighlight = () => {
    if (highlightedChain.length > 0) {
      setHighlightedChain([]);
    }
  };

  return (
    <div className="panel px-2 py-1.5 flex items-center gap-1">
      <div className="flex items-center gap-1 pr-2 border-r border-slate-700">
        <button
          onClick={toggleRunning}
          disabled={components.filter((c) => c.type === 'motor').length === 0}
          className={isRunning ? 'btn btn-danger' : 'btn btn-primary'}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4" />
              停止
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              启动
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-slate-700">
        <button onClick={handleSave} className="btn btn-ghost" title="保存JSON">
          <Download className="w-4 h-4" />
          保存
        </button>
        <button onClick={handleLoad} className="btn btn-ghost" title="加载JSON">
          <Upload className="w-4 h-4" />
          加载
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-slate-700">
        <button onClick={handleExportImage} className="btn btn-ghost" title="导出场景图片">
          <Image className="w-4 h-4" />
          截图
        </button>
        <button onClick={handleExportSteps} className="btn btn-ghost" title="导出步骤图">
          <LayoutGrid className="w-4 h-4" />
          步骤图
        </button>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-slate-700">
        <button
          onClick={toggleExplosionView}
          className={`btn ${explosionView ? 'btn-accent' : 'btn-ghost'}`}
          title="爆炸视图"
        >
          <Maximize2 className="w-4 h-4" />
          爆炸
        </button>
        {explosionView && (
          <div className="flex items-center gap-1 px-2">
            <span className="text-xs text-slate-400">强度:</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={explosionFactor}
              onChange={(e) => setExplosionFactor(parseFloat(e.target.value))}
              className="w-20 accent-accent-500"
            />
            <span className="text-xs text-slate-300 font-mono w-8">
              {explosionFactor.toFixed(1)}x
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-slate-700">
        <button onClick={cycleBackground} className="btn btn-ghost" title="切换背景">
          {getBackgroundIcon()}
          {getBackgroundLabel()}
        </button>
        {highlightedChain.length > 0 && (
          <button onClick={toggleHighlight} className="btn btn-ghost" title="取消高亮">
            <Highlighter className="w-4 h-4" />
            取消高亮
          </button>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 px-2 border-r border-slate-700">
        <span className="text-xs text-slate-400">
          组件: <span className="text-slate-200 font-mono">{components.length}</span>
        </span>
        <span className="text-xs text-slate-400">
          连接:{' '}
          <span className="text-slate-200 font-mono">
            {gearConnections.length + beltConnections.length}
          </span>
        </span>
      </div>

      <button onClick={clearScene} className="btn btn-ghost" title="清空场景">
        <Trash2 className="w-4 h-4" />
        清空
      </button>
    </div>
  );
}
