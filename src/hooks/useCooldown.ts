import { useCallback, useRef } from 'react';

export function useCooldown() {
  const cooldowns = useRef(new Map<string, number>());

  const remainingSeconds = useCallback((externalUserId: string) => {
    const expiresAt = cooldowns.current.get(externalUserId) ?? 0;
    const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
    if (remaining <= 0) {
      cooldowns.current.delete(externalUserId);
      return 0;
    }
    return remaining;
  }, []);

  const activate = useCallback((externalUserId: string, seconds: number) => {
    cooldowns.current.set(externalUserId, Date.now() + seconds * 1000);
  }, []);

  return { remainingSeconds, activate };
}
