import { XCircle, X, FileJson } from 'lucide-react';
import { useSceneStore } from '../../store/useSceneStore';

export function LoadErrorToast() {
  const loadError = useSceneStore((s) => s.loadError);
  const setLoadError = useSceneStore((s) => s.setLoadError);

  if (!loadError) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="panel border-red-500/50 bg-red-950/90 backdrop-blur-sm shadow-xl shadow-red-900/20">
        <div className="flex items-start gap-3 p-4">
          <div className="p-1.5 bg-red-500/20 rounded-lg shrink-0">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-red-200">加载失败</h3>
              {loadError.fileName && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-900/50 rounded text-[11px] text-red-300 font-mono truncate max-w-[160px]">
                  <FileJson className="w-3 h-3 shrink-0" />
                  {loadError.fileName}
                </span>
              )}
            </div>
            <p className="text-sm text-red-300 mb-1">{loadError.message}</p>
            {loadError.details && (
              <p className="text-xs text-red-400/80 font-mono bg-black/20 rounded px-2 py-1 mt-2 overflow-x-auto">
                {loadError.details}
              </p>
            )}
          </div>
          <button
            onClick={() => setLoadError(null)}
            className="p-1 text-red-400/60 hover:text-red-300 hover:bg-red-900/40 rounded transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
