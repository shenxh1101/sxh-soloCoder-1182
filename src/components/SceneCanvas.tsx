import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GridFloor } from './three/GridFloor';
import { SceneComponents } from './three/SceneComponents';
import { DragPlane } from './three/DragPlane';
import { useSceneStore } from '../store/useSceneStore';
import {
  detectGearConnections,
  detectBeltConnections,
  calculateTransmissionSpeeds,
} from '../engine/TransmissionEngine';
import type { BackgroundType } from '../types';

interface SceneCanvasProps {
  background: BackgroundType;
}

function ConnectionManager() {
  const components = useSceneStore((s) => s.components);
  const setGearConnections = useSceneStore((s) => s.setGearConnections);
  const setBeltConnections = useSceneStore((s) => s.setBeltConnections);
  const isRunning = useSceneStore((s) => s.isRunning);
  const updateComponentSpeeds = useSceneStore((s) => s.updateComponentSpeeds);
  const gearConnections = useSceneStore((s) => s.gearConnections);
  const beltConnections = useSceneStore((s) => s.beltConnections);

  const lastGearConnsRef = useRef<string>('');
  const lastBeltConnsRef = useRef<string>('');
  const lastSpeedsRef = useRef<string>('');

  useEffect(() => {
    const gearConns = detectGearConnections(components);
    const beltConns = detectBeltConnections(components);
    const gearConnsStr = JSON.stringify(gearConns);
    const beltConnsStr = JSON.stringify(beltConns);

    if (gearConnsStr !== lastGearConnsRef.current) {
      lastGearConnsRef.current = gearConnsStr;
      setGearConnections(gearConns);
    }
    if (beltConnsStr !== lastBeltConnsRef.current) {
      lastBeltConnsRef.current = beltConnsStr;
      setBeltConnections(beltConns);
    }
  }, [components, setGearConnections, setBeltConnections]);

  useEffect(() => {
    if (isRunning) {
      const speeds = calculateTransmissionSpeeds(components, gearConnections, beltConnections);
      const speedsArr = Array.from(speeds.entries());
      const speedsStr = JSON.stringify(speedsArr);
      if (speedsStr !== lastSpeedsRef.current) {
        lastSpeedsRef.current = speedsStr;
        updateComponentSpeeds(speeds);
      }
    } else {
      if (lastSpeedsRef.current !== '[]') {
        lastSpeedsRef.current = '[]';
        updateComponentSpeeds(new Map());
      }
    }
  }, [isRunning, components, gearConnections, beltConnections, updateComponentSpeeds]);

  return null;
}

function BackgroundSetter({ background }: { background: BackgroundType }) {
  const { scene } = useThree();

  useEffect(() => {
    switch (background) {
      case 'dark':
        scene.background = new THREE.Color('#0f172a');
        break;
      case 'blueprint':
        scene.background = new THREE.Color('#f0f4f8');
        break;
      case 'transparent':
        scene.background = null;
        break;
    }
  }, [background, scene]);

  return null;
}

function Lights({ background }: { background: BackgroundType }) {
  const intensity = background === 'blueprint' ? 1.2 : background === 'transparent' ? 0.8 : 1.0;

  return (
    <>
      <ambientLight intensity={0.6 * intensity} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={0.8 * intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-5, 10, -5]} intensity={0.3 * intensity} />
    </>
  );
}

function SceneEmptyHelper() {
  const components = useSceneStore((s) => s.components);
  if (components.length > 0) return null;

  return (
    <group position={[0, 0.5, 0]}>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[1, 0.1, 16, 48]} />
        <meshStandardMaterial
          color="#3b82f6"
          transparent
          opacity={0.3}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[1.5, 0, 0]}>
        <torusGeometry args={[0.7, 0.08, 16, 36]} />
        <meshStandardMaterial
          color="#64748b"
          transparent
          opacity={0.3}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

interface SceneContentProps {
  background: BackgroundType;
}

function SceneContent({ background }: SceneContentProps) {
  const selectComponent = useSceneStore((s) => s.selectComponent);

  const handleBackgroundClick = () => {
    selectComponent(null);
  };

  return (
    <>
      <BackgroundSetter background={background} />
      <Lights background={background} />

      <group onClick={handleBackgroundClick}>
        <GridFloor background={background} size={40} divisions={40} />
      </group>

      <SceneEmptyHelper />
      <SceneComponents />
      <DragPlane />
      <ConnectionManager />

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={background === 'blueprint' ? 0.2 : 0.5}
        scale={40}
        blur={2}
        far={10}
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <SMAA />
      </EffectComposer>
    </>
  );
}

export const SceneCanvas = forwardRef<HTMLCanvasElement, SceneCanvasProps>(
  function SceneCanvas({ background }, ref) {
    const internalRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => internalRef.current as HTMLCanvasElement);

    const backgroundColor =
      background === 'blueprint'
        ? '#f0f4f8'
        : background === 'transparent'
        ? 'transparent'
        : '#0f172a';

    return (
      <Canvas
        ref={internalRef}
        shadows
        camera={{ position: [12, 10, 12], fov: 50 }}
        gl={{
          antialias: true,
          alpha: background === 'transparent',
          preserveDrawingBuffer: true,
        }}
        style={{ background: backgroundColor }}
        onCreated={({ gl }) => {
          gl.setClearColor(
            background === 'blueprint'
              ? '#f0f4f8'
              : background === 'transparent'
              ? '#000000'
              : '#0f172a',
            background !== 'transparent' ? 1 : 0
          );
        }}
      >
        <SceneContent background={background} />
      </Canvas>
    );
  }
);
