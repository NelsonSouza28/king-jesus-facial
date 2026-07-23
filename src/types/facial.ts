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

export interface RecognitionSettings {
  matchThreshold: number;
  intervalMs: number;
  cooldownSeconds: number;
}

export type RecognitionAnalysis =
  | { kind: 'NO_FACE' }
  | { kind: 'MULTIPLE_FACES' }
  | { kind: 'FACE_TOO_SMALL' }
  | { kind: 'INVALID_EMBEDDING' }
  | { kind: 'UNKNOWN' }
  | { kind: 'MATCH'; match: FaceMatch };

export interface RecognitionEvent {
  id: string;
  face_profile_id: string | null;
  external_user_id: string | null;
  confidence: number | null;
  distance: number | null;
  recognized_at: string;
  event_key: string;
  integration_status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';
  external_http_status: number | null;
  external_error: string | null;
  retry_count: number;
  last_attempt_at: string | null;
  created_at: string;
}

export interface RecognitionEventListItem extends RecognitionEvent {
  face_profile: {
    external_user_name: string;
    registration_number: string | null;
    class_name: string | null;
  } | null;
}
