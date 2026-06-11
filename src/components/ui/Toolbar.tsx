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
  Link,
  Link2Off,
  GitBranch,
  CircleDot,
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
  const setLoadError = useSceneStore((s) => s.setLoadError);
  const getSaveData = useSceneStore((s) => s.getSaveData);
  const background = useSceneStore((s) => s.background);
  const setBackground = useSceneStore((s) => s.setBackground);
  const explosionView = useSceneStore((s) => s.explosionView);
  const toggleExplosionView = useSceneStore((s) => s.toggleExplosionView);
  const explosionFactor = useSceneStore((s) => s.explosionFactor);
  const setExplosionFactor = useSceneStore((s) => s.setExplosionFactor);
  const setHighlightedChain = useSceneStore((s) => s.setHighlightedChain);
  const highlightedChain = useSceneStore((s) => s.highlightedChain);
  const connectionEditMode = useSceneStore((s) => s.connectionEditMode);
  const setConnectionEditMode = useSceneStore((s) => s.setConnectionEditMode);
  const setPendingBeltSelection = useSceneStore((s) => s.setPendingBeltSelection);
  const setPendingShaftSelection = useSceneStore((s) => s.setPendingShaftSelection);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const saveData = getSaveData();
    saveSceneToJSON(saveData.components, saveData.gearConnections, saveData.beltConnections, saveData.settings);
  };

  const handleLoad = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const data = await loadSceneFromJSON(file);
        setLoadError(null);
        loadScene(data);
      } catch (err: any) {
        console.error('加载失败:', err);
        let message = '加载文件失败';
        let details = '';
        if (err instanceof SyntaxError) {
          message = 'JSON 格式错误';
          details = err.message;
        } else if (err.message?.includes('component')) {
          message = '文件内容不完整';
          details = '缺少必要的 components 字段';
        } else if (err.message) {
          details = err.message;
        } else {
          details = '未知错误';
        }
        setLoadError({ message, details, fileName: file.name });
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportSteps = () => {
    if (components.length === 0) {
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

  const toggleBeltMode = () => {
    if (connectionEditMode === 'belt') {
      setConnectionEditMode(null);
      setPendingBeltSelection(null);
    } else {
      setConnectionEditMode('belt');
      setPendingShaftSelection(null);
    }
  };

  const toggleShaftMode = () => {
    if (connectionEditMode === 'shaft') {
      setConnectionEditMode(null);
      setPendingShaftSelection(null);
    } else {
      setConnectionEditMode('shaft');
      setPendingBeltSelection(null);
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
        <button
          onClick={toggleBeltMode}
          className={`btn ${connectionEditMode === 'belt' ? 'btn-accent' : 'btn-ghost'}`}
          title={connectionEditMode === 'belt' ? '退出皮带编辑模式' : '进入皮带编辑模式：点选两个皮带轮创建/删除皮带'}
        >
          {connectionEditMode === 'belt' ? (
            <>
              <Link2Off className="w-4 h-4" />
              退出皮带
            </>
          ) : (
            <>
              <Link className="w-4 h-4" />
              皮带编辑
            </>
          )}
        </button>
        <button
          onClick={toggleShaftMode}
          className={`btn ${connectionEditMode === 'shaft' ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'btn-ghost'}`}
          title={connectionEditMode === 'shaft' ? '退出同轴装配模式' : '进入同轴装配模式：先选组件再选轴，完成同轴装配'}
        >
          {connectionEditMode === 'shaft' ? (
            <>
              <CircleDot className="w-4 h-4" />
              退出同轴
            </>
          ) : (
            <>
              <GitBranch className="w-4 h-4" />
              同轴装配
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
