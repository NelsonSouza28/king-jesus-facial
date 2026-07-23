import type { FaceResult } from '@vladmandic/human';
import { detectFaces, validateEmbedding } from '../lib/human';
import type { CaptureQuality, FacialCapture } from '../types/facial';

const MAX_IMAGE_EDGE = 1280;

export function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || !canvas.width || !canvas.height) {
    throw new Error('Não foi possível capturar a imagem da câmera.');
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function imageMetrics(canvas: HTMLCanvasElement) {
  const sample = document.createElement('canvas');
  const ratio = Math.min(1, 180 / Math.max(canvas.width, canvas.height));
  sample.width = Math.max(1, Math.round(canvas.width * ratio));
  sample.height = Math.max(1, Math.round(canvas.height * ratio));
  const context = sample.getContext('2d', { willReadFrequently: true });
  if (!context) return { brightness: 128, sharpness: 100 };
  context.drawImage(canvas, 0, 0, sample.width, sample.height);
  const { data } = context.getImageData(0, 0, sample.width, sample.height);
  const gray = new Float32Array(sample.width * sample.height);
  let brightnessSum = 0;

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    const value = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    gray[pixel] = value;
    brightnessSum += value;
  }

  let laplacianSum = 0;
  let laplacianSquaredSum = 0;
  let count = 0;
  for (let y = 1; y < sample.height - 1; y += 1) {
    for (let x = 1; x < sample.width - 1; x += 1) {
      const index = y * sample.width + x;
      const laplacian =
        gray[index - 1] + gray[index + 1]
        + gray[index - sample.width] + gray[index + sample.width]
        - 4 * gray[index];
      laplacianSum += laplacian;
      laplacianSquaredSum += laplacian * laplacian;
      count += 1;
    }
  }

  const mean = count ? laplacianSum / count : 0;
  return {
    brightness: brightnessSum / gray.length,
    sharpness: count ? laplacianSquaredSum / count - mean * mean : 0,
  };
}

function qualityForFace(
  face: FaceResult,
  canvas: HTMLCanvasElement,
  brightness: number,
  sharpness: number,
): CaptureQuality {
  const faceAreaRatio = (face.box[2] * face.box[3]) / (canvas.width * canvas.height);
  const faceConfidence = face.faceScore || face.boxScore || face.score || 0;
  const roll = Math.abs(face.rotation?.angle.roll ?? 0);
  const yaw = Math.abs(face.rotation?.angle.yaw ?? 0);
  const pitch = Math.abs(face.rotation?.angle.pitch ?? 0);
  const eyesVisible =
    (face.annotations.leftEye?.length ?? 0) > 0
    && (face.annotations.rightEye?.length ?? 0) > 0;

  const base = { brightness, sharpness, faceAreaRatio, faceConfidence };
  if (faceAreaRatio < 0.1 || Math.min(face.box[2], face.box[3]) < 120) {
    return { ...base, valid: false, issue: 'FACE_TOO_SMALL', message: 'Aproxime o rosto da câmera.' };
  }
  if (roll > 0.38 || yaw > 0.5 || pitch > 0.5) {
    return { ...base, valid: false, issue: 'FACE_ANGLE', message: 'Mantenha o rosto reto e olhe para a câmera.' };
  }
  if (!eyesVisible) {
    return { ...base, valid: false, issue: 'EYES_NOT_VISIBLE', message: 'Deixe os dois olhos visíveis.' };
  }
  if (brightness < 45) {
    return { ...base, valid: false, issue: 'LOW_LIGHT', message: 'O ambiente está escuro. Procure mais luz.' };
  }
  if (brightness > 225) {
    return { ...base, valid: false, issue: 'HIGH_LIGHT', message: 'Há luz excessiva no rosto. Mude de posição.' };
  }
  if (sharpness < 18) {
    return { ...base, valid: false, issue: 'BLURRY', message: 'A imagem está tremida. Segure o celular e tente novamente.' };
  }
  return { ...base, valid: true, message: 'Captura aprovada. Confira a imagem antes de salvar.' };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const output = document.createElement('canvas');
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(canvas.width, canvas.height));
  output.width = Math.round(canvas.width * scale);
  output.height = Math.round(canvas.height * scale);
  output.getContext('2d')?.drawImage(canvas, 0, 0, output.width, output.height);

  return new Promise((resolve, reject) => {
    output.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Não foi possível comprimir a imagem.')),
      'image/jpeg',
      0.82,
    );
  });
}

export async function analyzeFacialCapture(canvas: HTMLCanvasElement): Promise<FacialCapture> {
  const result = await detectFaces(canvas);
  const metrics = imageMetrics(canvas);

  if (result.face.length === 0) {
    throw new Error('Nenhum rosto encontrado. Centralize o rosto e tente novamente.');
  }
  if (result.face.length > 1) {
    throw new Error('Mais de um rosto detectado. Deixe somente uma pessoa na imagem.');
  }

  const face = result.face[0];
  const quality = qualityForFace(face, canvas, metrics.brightness, metrics.sharpness);
  if (!quality.valid) throw new Error(quality.message);

  const embedding = validateEmbedding(face);
  if (!embedding) {
    throw new Error('O descritor facial não foi gerado corretamente. Tente outra captura.');
  }

  const blob = await canvasToBlob(canvas);
  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    embedding,
    quality,
  };
}
