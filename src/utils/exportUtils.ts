import type { SceneComponent, GearConnection, BeltConnection, BackgroundType } from '../types';
import { ComponentType } from '../types';

export interface SaveDataSettings {
  background: BackgroundType;
  explosionView: boolean;
  explosionFactor: number;
}

export interface SaveData {
  version: string;
  timestamp: number;
  components: SceneComponent[];
  gearConnections: GearConnection[];
  beltConnections: BeltConnection[];
  settings?: SaveDataSettings;
}

export const saveSceneToJSON = (
  components: SceneComponent[],
  gearConnections: GearConnection[],
  beltConnections: BeltConnection[],
  settings?: SaveDataSettings
): void => {
  const data: SaveData = {
    version: '2.0.0',
    timestamp: Date.now(),
    components,
    gearConnections,
    beltConnections,
    ...(settings ? { settings } : {}),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `mechanical-scene-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const validateSaveData = (data: any): SaveData => {
  if (!data || typeof data !== 'object') {
    throw new Error('文件不是有效的 JSON 对象');
  }

  if (!Array.isArray(data.components)) {
    throw new Error('缺少 components 数组');
  }

  const requiredFields = ['id', 'type', 'position', 'rotation'];
  data.components.forEach((comp: any, idx: number) => {
    requiredFields.forEach((field) => {
      if (!(field in comp)) {
        throw new Error(`组件 #${idx} 缺少字段: ${field}`);
      }
    });
    if (!Object.values(ComponentType).includes(comp.type)) {
      throw new Error(`组件 #${idx} 类型无效: ${comp.type}`);
    }
    if (!comp.position || typeof comp.position.x !== 'number') {
      throw new Error(`组件 #${idx} position 格式无效`);
    }
  });

  if (!Array.isArray(data.gearConnections)) {
    data.gearConnections = [];
  }
  if (!Array.isArray(data.beltConnections)) {
    data.beltConnections = [];
  }

  if (!data.settings) {
    data.settings = {
      background: 'dark',
      explosionView: false,
      explosionFactor: 1.5,
    };
  }

  if (!data.version) {
    data.version = '1.0.0';
  }

  return data as SaveData;
};

export const loadSceneFromJSON = (file: File): Promise<SaveData> => {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      reject(new Error('请选择 .json 格式的文件'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        if (!raw || raw.trim().length === 0) {
          reject(new Error('文件为空'));
          return;
        }
        const parsed = JSON.parse(raw);
        const validated = validateSaveData(parsed);
        resolve(validated);
      } catch (err: any) {
        if (err instanceof SyntaxError) {
          reject(new Error(`JSON 解析错误: ${err.message}`));
        } else {
          reject(err);
        }
      }
    };
    reader.onerror = () => reject(new Error('读取文件失败: ' + (reader.error?.message || '未知错误')));
    reader.readAsText(file);
  });
};

export const exportStepsImage = async (
  components: SceneComponent[],
  canvas: HTMLCanvasElement
): Promise<void> => {
  const sortedComponents = [...components].sort((a, b) => a.orderIndex - b.orderIndex);

  const stepsPerRow = 4;
  const rows = Math.ceil(sortedComponents.length / stepsPerRow);
  const stepWidth = 300;
  const stepHeight = 250;
  const padding = 20;
  const titleHeight = 60;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = stepWidth * stepsPerRow + padding * (stepsPerRow + 1);
  exportCanvas.height = titleHeight + rows * stepHeight + padding * (rows + 1);

  const ctx = exportCanvas.getContext('2d')!;
  ctx.fillStyle = '#f0f4f8';
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  ctx.strokeStyle = '#c5d0dc';
  ctx.lineWidth = 1;
  for (let x = 0; x < exportCanvas.width; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, exportCanvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < exportCanvas.height; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(exportCanvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#1a365d';
  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('装配步骤图', padding, 40);

  ctx.font = '14px Inter, sans-serif';
  ctx.fillStyle = '#4a6a8a';
  ctx.fillText(`共 ${sortedComponents.length} 个组件`, padding, 60);

  sortedComponents.forEach((comp, index) => {
    const col = index % stepsPerRow;
    const row = Math.floor(index / stepsPerRow);
    const x = padding + col * (stepWidth + padding);
    const y = titleHeight + padding + row * (stepHeight + padding);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2a4a6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, stepWidth, stepHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1a365d';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`步骤 ${index + 1}`, x + 15, y + 30);

    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#4a6a8a';
    ctx.fillText(comp.name, x + 15, y + 50);

    let compDesc = '';
    switch (comp.type) {
      case ComponentType.GEAR:
        compDesc = `齿轮 - ${(comp as any).teeth}齿`;
        break;
      case ComponentType.PULLEY:
        compDesc = '皮带轮';
        break;
      case ComponentType.SHAFT:
        compDesc = '传动轴';
        break;
      case ComponentType.MOTOR:
        compDesc = `电机 - ${(comp as any).speed} RPM`;
        break;
    }
    ctx.fillStyle = '#2a4a6b';
    ctx.font = '14px JetBrains Mono, monospace';
    ctx.fillText(compDesc, x + 15, y + 75);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(
      `位置: (${comp.position.x.toFixed(1)}, ${comp.position.y.toFixed(1)}, ${comp.position.z.toFixed(1)})`,
      x + 15,
      y + stepHeight - 30
    );

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(x + stepWidth - 35, y + 30, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${index + 1}`, x + stepWidth - 35, y + 35);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#1e40af';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('▼', x + stepWidth / 2 - 6, y + stepHeight - 10);
  });

  const link = document.createElement('a');
  link.download = `assembly-steps-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportSceneImage = (canvas: HTMLCanvasElement): void => {
  const link = document.createElement('a');
  link.download = `scene-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
