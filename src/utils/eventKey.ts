export function createRecognitionEventKey(profileId: string, recognizedAt: Date) {
  return [
    'face',
    profileId,
    recognizedAt.toISOString(),
    crypto.randomUUID(),
  ].join(':');
}
