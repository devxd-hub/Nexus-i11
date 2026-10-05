import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Ensure GSAP plugins are registered
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Module-level singleton state to guarantee exactly ONE Lenis instance
let globalLenisInstance: Lenis | null = null;
let activeHookCount = 0;
let tickerCallback: ((time: number, deltaTime: number, frame: number) => void) | null = null;
let scrollTriggerSyncHandler: (() => void) | null = null;

function initLenis(isReducedMotion: boolean): Lenis {
  if (globalLenisInstance) {
    return globalLenisInstance;
  }

  // 1. Initialize Lenis with exact configuration
  const lenis = new Lenis({
    duration: isReducedMotion ? 0 : 0.8,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: !isReducedMotion,
    allowNestedScroll: true,
  });

  globalLenisInstance = lenis;

  // 2. Synchronize Lenis with GSAP ScrollTrigger
  scrollTriggerSyncHandler = () => {
    ScrollTrigger.update();
  };
  lenis.on('scroll', scrollTriggerSyncHandler);

  // 3. Drive Lenis through GSAP's ticker (convert seconds to milliseconds)
  tickerCallback = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);

  // 4. Disable GSAP ticker lag smoothing for deterministic frame stepping
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

function cleanupLenis() {
  if (!globalLenisInstance) return;

  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
  }

  if (scrollTriggerSyncHandler) {
    globalLenisInstance.off('scroll', scrollTriggerSyncHandler);
    scrollTriggerSyncHandler = null;
  }

  globalLenisInstance.destroy();
  globalLenisInstance = null;
}

/**
 * useLenis Hook
 * Initializes and provides the single shared Lenis smooth-scrolling instance.
 * Automatically manages GSAP Ticker synchronization, ScrollTrigger updates, and prefers-reduced-motion.
 */
export function useLenis() {
  const [lenis, setLenis] = useState<Lenis | null>(() => globalLenisInstance);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
      if (globalLenisInstance) {
        if (e.matches) {
          // Disable smooth wheel on reduced motion
          globalLenisInstance.options.smoothWheel = false;
          globalLenisInstance.options.duration = 0;
        } else {
          globalLenisInstance.options.smoothWheel = true;
          globalLenisInstance.options.duration = 0.8;
        }
      }
    };

    mediaQuery.addEventListener('change', handleMotionChange);

    // Initialize or reference singleton
    activeHookCount++;
    const instance = initLenis(mediaQuery.matches);
    setLenis(instance);

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      activeHookCount--;
      if (activeHookCount <= 0) {
        activeHookCount = 0;
        cleanupLenis();
      }
    };
  }, []);

  return { lenis, isReducedMotion };
}

export default useLenis;
