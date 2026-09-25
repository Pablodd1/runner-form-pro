/**
 * MediaPipe Pose Dynamic Script Loader & Pose Model Initializer.
 * Loads the official MediaPipe Pose Wasm runtime and 33-landmark model.
 * 
 * Sources priority:
 * 1. Local Vite static assets (/mediapipe/pose.js) - instantaneous, offline, rock-solid
 * 2. jsDelivr CDN
 * 3. unpkg CDN
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let window: any;

let isScriptLoading = false;
let isScriptLoaded = false;
const loadCallbacks: ((success: boolean) => void)[] = [];

const LOCAL_BASE = '/mediapipe';
const PRIMARY_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404';
const FALLBACK_CDN = 'https://unpkg.com/@mediapipe/pose@0.5.1675469404';

let activeAssetBase = LOCAL_BASE;

export function getPoseLocateFile(file: string): string {
  return `${activeAssetBase}/${file}`;
}

function injectScript(src: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if script tag with this src already exists
    if (document.querySelector(`script[src="${src}"]`)) {
      if (window.Pose) {
        resolve(true);
        return;
      }
    }

    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.async = true;

    const timer = window.setTimeout(() => {
      console.warn(`[MediaPipeLoader] Script load timed out (${timeoutMs}ms): ${src}`);
      resolve(false);
    }, timeoutMs);

    script.onload = () => {
      window.clearTimeout(timer);
      resolve(true);
    };

    script.onerror = () => {
      window.clearTimeout(timer);
      console.warn(`[MediaPipeLoader] Script failed to load: ${src}`);
      resolve(false);
    };

    document.head.appendChild(script);
  });
}

export async function loadMediaPipeScripts(): Promise<boolean> {
  // Already loaded?
  if (window.Pose) {
    isScriptLoaded = true;
    return true;
  }

  if (isScriptLoaded) {
    return !!window.Pose;
  }

  if (isScriptLoading) {
    return new Promise((resolve) => {
      loadCallbacks.push(resolve);
    });
  }

  isScriptLoading = true;

  console.log('🔄 Loading MediaPipe Pose engine...');

  // 1. Try local host asset first (/mediapipe/pose.js)
  let loaded = await injectScript(`${LOCAL_BASE}/pose.js`, 5000);
  if (loaded && window.Pose) {
    console.log('✅ Loaded MediaPipe Pose locally from host (/mediapipe/)');
    activeAssetBase = LOCAL_BASE;
  } else {
    // 2. Try primary CDN
    console.log('🌐 Local not available, trying jsDelivr CDN...');
    loaded = await injectScript(`${PRIMARY_CDN}/pose.js`, 12000);
    if (loaded && window.Pose) {
      console.log('✅ Loaded MediaPipe Pose from jsDelivr CDN');
      activeAssetBase = PRIMARY_CDN;
    } else {
      // 3. Try fallback CDN
      console.log('🌐 Trying fallback CDN (unpkg)...');
      loaded = await injectScript(`${FALLBACK_CDN}/pose.js`, 12000);
      if (loaded && window.Pose) {
        console.log('✅ Loaded MediaPipe Pose from unpkg CDN');
        activeAssetBase = FALLBACK_CDN;
      }
    }
  }

  if (!window.Pose) {
    console.error('❌ Failed to load MediaPipe Pose from all available sources');
    isScriptLoading = false;
    loadCallbacks.forEach((cb) => cb(false));
    loadCallbacks.length = 0;
    return false;
  }

  isScriptLoaded = true;
  isScriptLoading = false;
  loadCallbacks.forEach((cb) => cb(true));
  loadCallbacks.length = 0;
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createPoseDetector(
  onResults: (results: any) => void,
  modelComplexity: 0 | 1 | 2 = 1
): Promise<any> {
  const loaded = await loadMediaPipeScripts();

  if (!loaded || !window.Pose) {
    throw new Error('MediaPipe Pose library is not available.');
  }

  const pose = new window.Pose({
    locateFile: (file: string) => getPoseLocateFile(file),
  });

  pose.setOptions({
    modelComplexity, // 0 = Lite (low-power), 1 = Full (balanced), 2 = Heavy (clinical HQ)
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  pose.onResults(onResults);
  return pose;
}
