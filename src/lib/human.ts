import { Human, type Config, type FaceResult, type Result } from '@vladmandic/human';
import { FACE_EMBEDDING_DIMENSION } from './constants';

const baseConfig: Partial<Config> = {
  backend: 'webgl',
  modelBasePath: '/models/',
  cacheSensitivity: 0,
  debug: false,
  filter: {
    enabled: true,
    equalization: false,
    flip: false,
  },
  face: {
    enabled: true,
    detector: {
      modelPath: 'blazeface.json',
      rotation: true,
      maxDetected: 2,
      minConfidence: 0.65,
      minSize: 100,
      return: false,
      square: false,
    },
    mesh: {
      enabled: true,
      modelPath: 'facemesh.json',
      keepInvalid: false,
    },
    iris: { enabled: false },
    description: {
      enabled: true,
      modelPath: 'faceres.json',
      minConfidence: 0.7,
    },
    emotion: { enabled: false },
    antispoof: { enabled: false },
    liveness: { enabled: false },
    attention: { enabled: false },
    gear: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
};

let human: Human | null = null;
let loadingPromise: Promise<Human> | null = null;
let activeBackend = 'webgl';

async function createHuman(
  backend: 'webgl' | 'cpu',
  onStatus?: (message: string) => void,
) {
  onStatus?.(`Carregando modelos faciais (${backend.toUpperCase()})…`);
  const instance = new Human({ ...baseConfig, backend });
  await instance.load();
  onStatus?.('Preparando o reconhecimento facial…');
  await instance.warmup();
  activeBackend = backend;
  return instance;
}

export async function loadHumanModels(onStatus?: (message: string) => void) {
  if (human) return human;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      human = await createHuman('webgl', onStatus);
    } catch {
      onStatus?.('WebGL indisponível. Ativando modo compatível…');
      human = await createHuman('cpu', onStatus);
    }
    onStatus?.('Modelos faciais prontos.');
    return human;
  })();

  try {
    return await loadingPromise;
  } catch {
    human = null;
    loadingPromise = null;
    throw new Error('Não foi possível carregar os modelos faciais.');
  }
}

export async function detectFaces(
  input: HTMLCanvasElement | HTMLVideoElement,
): Promise<Result> {
  const instance = await loadHumanModels();
  return instance.detect(input);
}

export function validateEmbedding(face: FaceResult): number[] | null {
  if (!face.embedding || face.embedding.length !== FACE_EMBEDDING_DIMENSION) {
    return null;
  }
  if (face.embedding.some((value) => !Number.isFinite(value))) {
    return null;
  }
  return [...face.embedding];
}

export function getHumanDiagnostics() {
  return {
    backend: activeBackend,
    embeddingDimension: FACE_EMBEDDING_DIMENSION,
  };
}
