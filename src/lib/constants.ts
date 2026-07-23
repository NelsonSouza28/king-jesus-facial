/**
 * Dimensão verificada para o descritor `face.embedding` produzido pelo modelo
 * FaceRes do @vladmandic/human 3.3.6. A migration PostgreSQL usa o mesmo valor.
 *
 * Se o modelo facial for trocado, gere um descritor real, confirme seu tamanho
 * e altere esta constante e a migration antes de armazenar novos perfis.
 */
export const FACE_EMBEDDING_DIMENSION = 1024;
export const FACE_EMBEDDING_MODEL = 'faceres';

export const DEFAULT_MATCH_THRESHOLD = 0.65;
export const DEFAULT_RECOGNITION_INTERVAL_MS = 1_000;
export const DEFAULT_RECOGNITION_COOLDOWN_SECONDS = 30;

export const FACE_IMAGE_BUCKET = 'face-images';
export const FACE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const FACE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
