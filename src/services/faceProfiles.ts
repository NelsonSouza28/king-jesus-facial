import { DEFAULT_MATCH_THRESHOLD, FACE_EMBEDDING_DIMENSION } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { ExternalUser } from '../types/external';
import type { FaceMatch, SafeFaceProfile } from '../types/facial';
import { removeFaceImage, uploadFaceImage } from './storage';

export async function getActiveProfile(externalUserId: string) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase
    .from('face_profiles_safe')
    .select('*')
    .eq('external_user_id', externalUserId)
    .eq('active', true)
    .maybeSingle();
  if (error) throw new Error('Não foi possível verificar o cadastro facial.');
  return data as SafeFaceProfile | null;
}

export async function findPossibleDuplicates(embedding: number[]) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const thresholdFromEnv = Number(import.meta.env.VITE_FACE_MATCH_THRESHOLD);
  const threshold = Number.isFinite(thresholdFromEnv) && thresholdFromEnv > 0
    ? thresholdFromEnv
    : DEFAULT_MATCH_THRESHOLD;
  const { data, error } = await supabase.rpc('match_face_profile', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: 3,
  });
  if (error) throw new Error('Não foi possível verificar possíveis duplicidades.');
  return (data ?? []) as FaceMatch[];
}

export async function saveFaceProfile({
  userId,
  externalUser,
  embedding,
  image,
  existingProfile,
}: {
  userId: string;
  externalUser: ExternalUser;
  embedding: number[];
  image: Blob;
  existingProfile: SafeFaceProfile | null;
}) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const profileId = existingProfile?.id ?? crypto.randomUUID();
  const newImagePath = await uploadFaceImage(userId, profileId, image);

  if (existingProfile) {
    const { error } = await supabase
      .from('face_profiles')
      .update({
        external_user_name: externalUser.name,
        registration_number: externalUser.registrationNumber,
        class_name: externalUser.className,
        embedding,
        embedding_dimension: FACE_EMBEDDING_DIMENSION,
        image_path: newImagePath,
        consent_given: true,
        active: true,
      })
      .eq('id', existingProfile.id);

    if (error) {
      await removeFaceImage(newImagePath);
      throw new Error('Não foi possível substituir o cadastro facial.');
    }

    if (existingProfile.image_path && existingProfile.image_path !== newImagePath) {
      await removeFaceImage(existingProfile.image_path);
    }
    return existingProfile.id;
  }

  const { error } = await supabase.from('face_profiles').insert({
    id: profileId,
    external_user_id: externalUser.id,
    external_user_name: externalUser.name,
    registration_number: externalUser.registrationNumber,
    class_name: externalUser.className,
    embedding,
    embedding_dimension: FACE_EMBEDDING_DIMENSION,
    image_path: newImagePath,
    consent_given: true,
    active: true,
    created_by: userId,
  });

  if (error) {
    await removeFaceImage(newImagePath);
    if (error.code === '23505') throw new Error('Este aluno já possui um cadastro facial ativo.');
    throw new Error('Não foi possível salvar o cadastro facial.');
  }
  return profileId;
}

export async function removeFaceProfile(profile: SafeFaceProfile) {
  if (!supabase) throw new Error('Supabase não configurado.');
  if (profile.image_path) await removeFaceImage(profile.image_path);
  const { error } = await supabase.from('face_profiles').delete().eq('id', profile.id);
  if (error) throw new Error('Não foi possível remover o cadastro facial.');
}
