
import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';

/**
 * A hook to prevent multiple rapid navigation calls which can cause
 * overlapping screens or crashes.
 */
export function useSafeNavigation() {
  const router = useRouter();
  const isNavigating = useRef(false);

  // Time to wait before allowing another navigation attempt
  const NAVIGATION_DEBOUNCE_MS = 1000;

  const resetFlag = useCallback(() => {
    setTimeout(() => {
      isNavigating.current = false;
    }, NAVIGATION_DEBOUNCE_MS);
  }, []);

  const safePush = useCallback((href: any) => {
    if (isNavigating.current) return;
    
    isNavigating.current = true;
    router.push(href);
    resetFlag();
  }, [router, resetFlag]);

  const safeReplace = useCallback((href: any) => {
    if (isNavigating.current) return;
    
    isNavigating.current = true;
    router.replace(href);
    resetFlag();
  }, [router, resetFlag]);

  const safeBack = useCallback(() => {
    if (isNavigating.current) return;
    
    isNavigating.current = true;
    router.back();
    // Shorter debounce for back action as it might be cancelled/quick
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  }, [router]);

  return { safePush, safeReplace, safeBack, router };
}
