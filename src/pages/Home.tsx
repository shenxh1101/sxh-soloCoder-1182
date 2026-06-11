import { useRef } from 'react';
import { SceneCanvas } from '../components/SceneCanvas';
import { ComponentLibrary } from '../components/ui/ComponentLibrary';
import { Toolbar } from '../components/ui/Toolbar';
import { InfoPanel } from '../components/ui/InfoPanel';
import { StatusBar } from '../components/ui/StatusBar';
import { LoadErrorToast } from '../components/ui/LoadErrorToast';
import { useSceneStore } from '../store/useSceneStore';

export default function Home() {
  const background = useSceneStore((s) => s.background);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canvasContainerClass =
    background === 'blueprint' ? 'blueprint-bg' : '';

  return (
    <div
      className={`w-full h-full flex flex-col ${
        background === 'dark' ? 'bg-slate-900' : ''
      }`}
    >
      <LoadErrorToast />

      <div className="p-2 pb-1">
        <Toolbar canvasRef={canvasRef} />
      </div>

      <div className="flex-1 flex gap-2 px-2 overflow-hidden">
        <ComponentLibrary />

        <div
          className={`flex-1 rounded-lg overflow-hidden relative ${canvasContainerClass}`}
          style={{ minHeight: 0 }}
        >
          <SceneCanvas ref={canvasRef} background={background} />
        </div>

        <InfoPanel />
      </div>

      <div className="p-2 pt-1">
        <StatusBar />
      </div>
    </div>
  );
}
