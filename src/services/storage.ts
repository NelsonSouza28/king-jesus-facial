import { FACE_IMAGE_BUCKET } from '../lib/constants';
import { supabase } from '../lib/supabase';

export async function uploadFaceImage(
  authUserId: string,
  faceProfileId: string,
  image: Blob,
) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const imageId = crypto.randomUUID();
  const path = `${authUserId}/${faceProfileId}/${imageId}.jpg`;
  const { error } = await supabase.storage
    .from(FACE_IMAGE_BUCKET)
    .upload(path, image, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });
  if (error) throw new Error('Não foi possível enviar a imagem facial.');
  return path;
}

export async function removeFaceImage(path: string | null) {
  if (!supabase || !path) return;
  const { error } = await supabase.storage.from(FACE_IMAGE_BUCKET).remove([path]);
  if (error) throw new Error('Não foi possível remover a imagem facial antiga.');
}
