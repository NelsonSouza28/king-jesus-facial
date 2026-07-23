export interface SafeFaceProfile {
  id: string;
  external_user_id: string;
  external_user_name: string;
  registration_number: string | null;
  class_name: string | null;
  image_path: string | null;
  consent_given: boolean;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaceMatch {
  id: string;
  external_user_id: string;
  external_user_name: string;
  registration_number: string | null;
  class_name: string | null;
  image_path: string | null;
  distance: number;
  similarity: number;
}

export type CaptureIssue =
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'FACE_TOO_SMALL'
  | 'FACE_ANGLE'
  | 'EYES_NOT_VISIBLE'
  | 'LOW_LIGHT'
  | 'HIGH_LIGHT'
  | 'BLURRY'
  | 'NO_EMBEDDING'
  | 'INVALID_EMBEDDING';

export interface CaptureQuality {
  valid: boolean;
  issue?: CaptureIssue;
  message: string;
  brightness: number;
  sharpness: number;
  faceAreaRatio: number;
  faceConfidence: number;
}

export interface FacialCapture {
  blob: Blob;
  previewUrl: string;
  embedding: number[];
  quality: CaptureQuality;
}
