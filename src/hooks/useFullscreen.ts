import { useState, useEffect, useCallback, RefObject } from 'react';

interface FullscreenAPI {
  requestFullscreen?: () => Promise<void>;
  exitFullscreen?: () => Promise<void>;
  fullscreenElement?: Element | null;
  fullscreenEnabled?: boolean;
}

interface DocumentWithFullscreen extends Document {
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitFullscreenElement?: Element | null;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
}

interface ElementWithFullscreen extends HTMLElement {
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
}

export function useFullscreen(elementRef: RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getBrowserFullscreenAPI = useCallback((): FullscreenAPI => {
    const doc = document as DocumentWithFullscreen;
    
    if (doc.fullscreenEnabled !== undefined) {
      return {
        requestFullscreen: () => elementRef.current?.requestFullscreen() || Promise.resolve(),
        exitFullscreen: () => doc.exitFullscreen(),
        fullscreenElement: doc.fullscreenElement,
        fullscreenEnabled: doc.fullscreenEnabled
      };
    } else if (doc.webkitFullscreenElement !== undefined) {
      return {
        requestFullscreen: () => (elementRef.current as ElementWithFullscreen)?.webkitRequestFullscreen?.() || Promise.resolve(),
        exitFullscreen: () => doc.webkitExitFullscreen?.() || Promise.resolve(),
        fullscreenElement: doc.webkitFullscreenElement,
        fullscreenEnabled: true
      };
    } else if (doc.mozFullScreenElement !== undefined) {
      return {
        requestFullscreen: () => (elementRef.current as ElementWithFullscreen)?.mozRequestFullScreen?.() || Promise.resolve(),
        exitFullscreen: () => doc.mozCancelFullScreen?.() || Promise.resolve(),
        fullscreenElement: doc.mozFullScreenElement,
        fullscreenEnabled: true
      };
    } else if (doc.msFullscreenElement !== undefined) {
      return {
        requestFullscreen: () => (elementRef.current as ElementWithFullscreen)?.msRequestFullscreen?.() || Promise.resolve(),
        exitFullscreen: () => doc.msExitFullscreen?.() || Promise.resolve(),
        fullscreenElement: doc.msFullscreenElement,
        fullscreenEnabled: true
      };
    }
    
    return {
      fullscreenEnabled: false
    };
  }, [elementRef]);

  const enterFullscreen = useCallback(async () => {
    try {
      const api = getBrowserFullscreenAPI();
      if (api.requestFullscreen && elementRef.current) {
        await api.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  }, [elementRef, getBrowserFullscreenAPI]);

  const exitFullscreen = useCallback(async () => {
    try {
      const api = getBrowserFullscreenAPI();
      if (api.exitFullscreen) {
        await api.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  }, [getBrowserFullscreenAPI]);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const api = getBrowserFullscreenAPI();
      setIsFullscreen(!!api.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [getBrowserFullscreenAPI]);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    fullscreenEnabled: getBrowserFullscreenAPI().fullscreenEnabled || false
  };
}