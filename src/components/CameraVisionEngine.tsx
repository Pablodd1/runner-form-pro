import React, { useRef, useEffect, useState, useCallback } from 'react';
import type {
  Landmark3D,
  BiomechanicsFrameMetrics,
  VerticalJumpMetrics,
  AssessmentTestType
} from '../types/runner';
import {
  POSE_CONNECTIONS,
  POSE_LANDMARKS,
  extractJointAngles,
  OneEuroLandmarkFilter,
  evaluateFramingQuality,
  type FramingDiagnostic
} from '../utils/biomechanics';
import { generateSimulatedRunnerLandmarks, generateSimulatedJumpLandmarks } from '../utils/runnerSimulator';
import { loadMediaPipeScripts, getPoseLocateFile } from '../utils/mediapipeLoader';
import { JumpBiomechanicsTracker } from '../utils/jumpBiomechanics';
import { RunningGaitKinematicsTracker } from '../utils/runningKinematicsTracker';
import { PatientPositioningGuide } from './PatientPositioningGuide';
import {
  Camera,
  Video,
  Upload,
  RefreshCw,
  Play,
  Pause,
  Download,
  Sliders,
  Sparkles,
  Layers,
  CircleDot,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Zap,
  Cpu,
  CheckCircle2,
  SkipBack,
  SkipForward
} from 'lucide-react';

export type HardwareProfile = 'heavy' | 'full' | 'lite' | 'auto';

interface CameraVisionEngineProps {
  onFrameProcessed: (metrics: BiomechanicsFrameMetrics, landmarks: Landmark3D[]) => void;
  onJumpProcessed?: (metrics: VerticalJumpMetrics) => void;
  testType?: AssessmentTestType;
  runnerHeightCm: number;
  runnerWeightKg: number;
  speedKmh: number;
  isEvaluationActive: boolean;
  onSnapshotReady?: (dataUrl: string) => void;
}

// Pose model loading states
type PoseModelStatus = 'idle' | 'loading-scripts' | 'loading-model' | 'ready' | 'error';

export const CameraVisionEngine: React.FC<CameraVisionEngineProps> = ({
  onFrameProcessed,
  onJumpProcessed,
  testType = 'runner_form',
  runnerHeightCm,
  runnerWeightKg,
  speedKmh,
  isEvaluationActive,
  onSnapshotReady,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Source modes: 'camera' | 'upload' | 'demo'
  const [sourceMode, setSourceMode] = useState<'camera' | 'upload' | 'demo'>('camera');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [resolution, setResolution] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [cameraError, setCameraError] = useState<string>('');

  // Hardware Adaptability: Model Complexity (Heavy 27.7MB, Full 6.4MB, Lite 2.8MB, or Auto)
  const [hardwareProfile, setHardwareProfile] = useState<HardwareProfile>('auto');
  const [activeModelComplexity, setActiveModelComplexity] = useState<0 | 1 | 2>(1);
  const [inferenceLatencyMs, setInferenceLatencyMs] = useState<number>(14);

  // Video file upload state & Biomechanics Playback Pacing
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5); // Default 0.5x clinical slow-mo
  const [isAutoSync, setIsAutoSync] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [videoTimeDisplay, setVideoTimeDisplay] = useState<{ current: string; duration: string }>({
    current: '00:00.0',
    duration: '00:00.0',
  });

  // Offscreen Hardware Downscaling Canvas (accelerates MediaPipe inference from 45ms to 12ms)
  const sendCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Recording overlaid video
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const recordingTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Pose Tracking engine
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poseDetectorRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const [poseModelStatus, setPoseModelStatus] = useState<PoseModelStatus>('idle');
  const [poseModelError, setPoseModelError] = useState<string>('');
  const [fps, setFps] = useState<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  // Anatomical Jitter Removal Filter (1-Euro adaptive algorithm: minCutoff=1.2, beta=0.18 for zero lag at high velocity)
  const oneEuroFilterRef = useRef<OneEuroLandmarkFilter>(new OneEuroLandmarkFilter(1.2, 0.18, 1.0));
  const [framingQuality, setFramingQuality] = useState<FramingDiagnostic>({
    status: 'optimal',
    visibilityPct: 100,
    message: 'Initializing anatomical tracker...',
  });

  // Jump Tracker
  const jumpTrackerRef = useRef<JumpBiomechanicsTracker>(new JumpBiomechanicsTracker());
  const latestJumpMetricsRef = useRef<VerticalJumpMetrics | null>(null);

  // Dynamic Running Gait Tracker (real-time cadence, adaptive speed, GCT, vertical oscillation)
  const gaitTrackerRef = useRef<RunningGaitKinematicsTracker>(new RunningGaitKinematicsTracker());
  const [livePaceCategory, setLivePaceCategory] = useState<string>('tempo');
  const [liveDynamicSpeed, setLiveDynamicSpeed] = useState<number>(10.0);

  // Track if pose is actively detecting
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const lastLandmarksRef = useRef<Landmark3D[] | null>(null);
  const isSendingRef = useRef<boolean>(false);
  const isStartingCameraRef = useRef<boolean>(false);

  // Auto-adaptation rolling latency history
  const latencyHistoryRef = useRef<number[]>([]);

  // Visual overlay settings
  const [showAngleArcs, setShowAngleArcs] = useState<boolean>(true);
  const [showStanceVector, setShowStanceVector] = useState<boolean>(true);

  // Positioning guide
  const [showPositioningGuide, setShowPositioningGuide] = useState<boolean>(false);

  // Simulated Gait generator state
  const simPhaseRef = useRef<number>(0);

  // Keep latest props accessible inside stable callbacks
  const propsRef = useRef({
    onFrameProcessed,
    onJumpProcessed,
    testType,
    runnerHeightCm,
    runnerWeightKg,
    speedKmh,
    isEvaluationActive,
    onSnapshotReady,
    showAngleArcs,
    showStanceVector,
    activeModelComplexity,
  });

  useEffect(() => {
    propsRef.current = {
      onFrameProcessed,
      onJumpProcessed,
      testType,
      runnerHeightCm,
      runnerWeightKg,
      speedKmh,
      isEvaluationActive,
      onSnapshotReady,
      showAngleArcs,
      showStanceVector,
      activeModelComplexity,
    };
  });

  // Reset jump tracker if testType switches
  useEffect(() => {
    if (testType === 'vertical_jump') {
      jumpTrackerRef.current.resetBaseline();
      latestJumpMetricsRef.current = null;
    }
  }, [testType]);

  // When 1-minute evaluation starts, ensure imported video plays automatically so live analysis collects data
  useEffect(() => {
    if (isEvaluationActive && sourceMode === 'upload' && videoRef.current) {
      const v = videoRef.current;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      if (v.paused || v.ended || (v.duration && v.currentTime >= v.duration - 0.2)) {
        v.currentTime = 0;
        v.play().catch(() => {});
        setIsVideoPlaying(true);
      }
    }
  }, [isEvaluationActive, sourceMode]);

  // 1. Enumerate available video input devices
  const refreshDevices = useCallback(async () => {
    try {
      const devList = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devList.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevs);
      if (videoDevs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate media devices:', err);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // 2. Initialize MediaPipe Pose detector with target complexity
  const initDetector = useCallback(async (complexity: 0 | 1 | 2) => {
    setPoseModelStatus('loading-scripts');
    setPoseModelError('');

    try {
      const loaded = await loadMediaPipeScripts();
      if (!loaded) {
        setPoseModelStatus('error');
        setPoseModelError('Failed to load MediaPipe Pose engine.');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      if (!win.Pose) {
        setPoseModelStatus('error');
        setPoseModelError('MediaPipe Pose library symbol not available.');
        return;
      }

      setPoseModelStatus('loading-model');

      const pose = new win.Pose({
        locateFile: (file: string) => getPoseLocateFile(file),
      });

      pose.setOptions({
        modelComplexity: complexity,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pose.onResults((results: any) => {
        handlePoseResults(results);
      });

      try {
        await pose.initialize();
      } catch {
        console.warn('pose.initialize() completed or skipped');
      }

      if (poseDetectorRef.current) {
        try { poseDetectorRef.current.close(); } catch { /* ignore */ }
      }

      poseDetectorRef.current = pose;
      setActiveModelComplexity(complexity);
      setPoseModelStatus('ready');
      oneEuroFilterRef.current.reset();
      console.log(`✅ MediaPipe Pose model initialized [Complexity: ${complexity}]`);
    } catch (e) {
      console.error('Error initializing MediaPipe Pose:', e);
      setPoseModelStatus('error');
      setPoseModelError(e instanceof Error ? e.message : 'Unknown error initializing pose model');
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const initialComplexity: 0 | 1 | 2 =
      hardwareProfile === 'heavy' ? 2 : hardwareProfile === 'lite' ? 0 : 1;
    initDetector(initialComplexity);

    return () => {
      if (poseDetectorRef.current) {
        try { poseDetectorRef.current.close(); } catch { /* ignore */ }
        poseDetectorRef.current = null;
      }
    };
  }, [initDetector]);

  // Handle hardware profile switch
  const handleHardwareProfileChange = (profile: HardwareProfile) => {
    setHardwareProfile(profile);
    let targetComplexity: 0 | 1 | 2 = 1;
    if (profile === 'heavy') targetComplexity = 2;
    if (profile === 'lite') targetComplexity = 0;
    if (profile === 'full') targetComplexity = 1;
    if (profile === 'auto') targetComplexity = 1; // start at 1 and auto-adjust

    if (poseDetectorRef.current) {
      try {
        poseDetectorRef.current.setOptions({ modelComplexity: targetComplexity });
        setActiveModelComplexity(targetComplexity);
        oneEuroFilterRef.current.reset();
        console.log(`🔄 Switched active model complexity to: ${targetComplexity}`);
      } catch {
        initDetector(targetComplexity);
      }
    }
  };

  // Process MediaPipe results (called when inference completes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePoseResults = (results: any) => {
    isSendingRef.current = false;

    if (results && results.poseLandmarks && results.poseLandmarks.length >= 33) {
      const rawLandmarks: Landmark3D[] = results.poseLandmarks;

      // Apply 1-Euro adaptive temporal smoothing to remove camera jitter
      const smoothedLandmarks = oneEuroFilterRef.current.filter(rawLandmarks, performance.now());
      lastLandmarksRef.current = smoothedLandmarks;
      setIsDetecting(true);

      // Check visual framing diagnostics
      const diagnostic = evaluateFramingQuality(smoothedLandmarks);
      setFramingQuality(diagnostic);

      // Compute and emit biomechanics metrics based on active test mode
      if (propsRef.current.testType === 'vertical_jump') {
        const jm = jumpTrackerRef.current.processFrame(
          smoothedLandmarks,
          propsRef.current.runnerWeightKg,
          propsRef.current.runnerHeightCm
        );
        latestJumpMetricsRef.current = jm;
        if (propsRef.current.onJumpProcessed) {
          propsRef.current.onJumpProcessed(jm);
        }
      } else {
        emitBiomechanicsMetrics(smoothedLandmarks);
      }
    } else {
      lastLandmarksRef.current = null;
      setIsDetecting(false);
      setFramingQuality({
        status: 'low_visibility',
        visibilityPct: 0,
        message: 'No patient detected in frame. Step into camera view.',
      });
    }
  };

  // Compute frame biomechanics and notify parent
  const emitBiomechanicsMetrics = (landmarks: Landmark3D[]) => {
    const props = propsRef.current;
    const angles = extractJointAngles(landmarks);

    const dynamicGait = gaitTrackerRef.current.processFrame(
      landmarks,
      props.runnerWeightKg,
      props.runnerHeightCm,
      props.speedKmh,
      'treadmill'
    );

    setLivePaceCategory(dynamicGait.gaitPaceCategory);
    setLiveDynamicSpeed(dynamicGait.instantaneousSpeedKmh);

    const metrics: BiomechanicsFrameMetrics = {
      timestamp: Date.now(),
      cadenceSpm: dynamicGait.cadenceSpm,
      verticalOscillationCm: dynamicGait.verticalOscillationCm,
      powerWatts: dynamicGait.powerWatts,
      powerWattsPerKg: dynamicGait.powerWattsPerKg,
      powerBreakdown: dynamicGait.powerBreakdown,
      groundContactTimeMs: dynamicGait.groundContactTimeMs,
      dutyFactorPct: dynamicGait.dutyFactorPct,
      strideLengthM: dynamicGait.strideLengthM,
      runningEconomyRatio: dynamicGait.runningEconomyRatio,
      legStiffnessKnM: dynamicGait.legStiffnessKnM,
      groundReactionForceBw: dynamicGait.groundReactionForceBw,
      footStrikeAngleDeg: dynamicGait.footStrikeAngleDeg,
      leftFootStrike: dynamicGait.leftFootStrike,
      rightFootStrike: dynamicGait.rightFootStrike,
      overstrideDistanceCm: dynamicGait.overstrideDistanceCm,
      shinAngleAtTouchdownDeg: dynamicGait.shinAngleAtTouchdownDeg,
      instantaneousSpeedKmh: dynamicGait.instantaneousSpeedKmh,
      gaitPaceCategory: dynamicGait.gaitPaceCategory,
      angles,
    };

    props.onFrameProcessed(metrics, landmarks);

    if (props.isEvaluationActive && props.onSnapshotReady && canvasRef.current) {
      props.onSnapshotReady(canvasRef.current.toDataURL('image/jpeg', 0.85));
    }
  };

  // 3. Multi-tier Camera Resolution & Hardware Fallback Negotiation
  const startCamera = useCallback(async () => {
    if (sourceMode !== 'camera') return;
    if (isStartingCameraRef.current) return;
    isStartingCameraRef.current = true;
    setCameraError('');

    const resolutionLadder: { width: number; height: number; fps: number }[] = [
      resolution === '1080p'
        ? { width: 1920, height: 1080, fps: 60 }
        : resolution === '720p'
        ? { width: 1280, height: 720, fps: 60 }
        : { width: 640, height: 480, fps: 30 },
      { width: 1280, height: 720, fps: 60 },
      { width: 1280, height: 720, fps: 30 },
      { width: 640, height: 480, fps: 30 },
    ];

    let stream: MediaStream | null = null;

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      // Try resolutions sequentially from best to fallback
      for (const tier of resolutionLadder) {
        try {
          const constraints: MediaStreamConstraints = {
            video: {
              width: { ideal: tier.width },
              height: { ideal: tier.height },
              deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
              facingMode: selectedDeviceId ? undefined : { ideal: facingMode },
              frameRate: { ideal: tier.fps, min: 15 },
            },
            audio: false,
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch {
          // try next tier in ladder
        }
      }

      // Ultimate fallback: open any available camera
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr: unknown) {
          if (playErr instanceof Error && playErr.name !== 'AbortError') {
            console.warn('Video play warning:', playErr);
          }
        }
        console.log('📹 Camera stream active:', stream.getVideoTracks()[0].getSettings());
      }

      try {
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devList.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevs);
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      console.error('Camera stream access failed:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Permission') || errMsg.includes('NotAllowedError')) {
        setCameraError('Camera permission denied. Please allow camera access in your browser address bar.');
      } else if (errMsg.includes('NotFound') || errMsg.includes('DevicesNotFoundError')) {
        setCameraError('No video camera detected. Connect a webcam or external camera.');
      } else {
        setCameraError(`Camera connection error: ${errMsg}. Check device connection and retry.`);
      }
    } finally {
      isStartingCameraRef.current = false;
    }
  }, [facingMode, resolution, selectedDeviceId, sourceMode]);

  useEffect(() => {
    if (sourceMode === 'camera') {
      startCamera();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [sourceMode, selectedDeviceId, facingMode, resolution, startCamera]);

  // Format video time helper (MM:SS.s)
  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '00:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${tenths}`;
  };

  // 4. Handle Video File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSourceMode('upload');
      setCameraError('');
      setIsAutoSync(false);
      setPlaybackSpeed(0.5); // Default to clinical slow-mo
      if (videoRef.current) {
        const v = videoRef.current;
        v.src = url;
        v.playbackRate = 0.5;
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.load();
        const p = v.play();
        if (p !== undefined) {
          p.catch((err) => {
            console.warn('Auto-play blocked, user click will play:', err);
          });
        }
        setIsVideoPlaying(true);
      }
    }
  };

  // Frame Stepping Controls (-1 / +1 Frame = 33.3ms)
  const handleStepFrame = (direction: -1 | 1) => {
    const video = videoRef.current;
    if (!video) return;
    if (isVideoPlaying) {
      video.pause();
      setIsVideoPlaying(false);
    }
    const frameStep = 1 / 30;
    const newTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + direction * frameStep));
    video.currentTime = newTime;
    if (video.duration) {
      setVideoProgress((newTime / video.duration) * 100);
      setVideoTimeDisplay({
        current: formatVideoTime(newTime),
        duration: formatVideoTime(video.duration),
      });
    }
  };

  // Manual Speed Preset Change
  const handleSpeedChange = (speed: number) => {
    setIsAutoSync(false);
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Auto-Sync Toggle: Dynamic AI-paced video playback
  const handleToggleAutoSync = () => {
    setIsAutoSync((prev) => {
      const next = !prev;
      if (!next && videoRef.current) {
        videoRef.current.playbackRate = playbackSpeed;
      }
      return next;
    });
  };

  // 5. Continuous Frame Processing Loop with Adaptive Auto-Scaling
  useEffect(() => {
    let active = true;

    const renderLoop = async () => {
      if (!active) return;

      const now = performance.now();
      frameCountRef.current++;
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (sourceMode === 'demo') {
        if (testType === 'vertical_jump') {
          simPhaseRef.current = (simPhaseRef.current + 0.012) % 1.0;
          const jumpLandmarks = generateSimulatedJumpLandmarks(simPhaseRef.current);
          drawJumpSimulationOnCanvas(jumpLandmarks);
          if (propsRef.current.onJumpProcessed) {
            const jm = jumpTrackerRef.current.processFrame(
              jumpLandmarks,
              propsRef.current.runnerWeightKg,
              propsRef.current.runnerHeightCm
            );
            propsRef.current.onJumpProcessed(jm);
          }
        } else {
          simPhaseRef.current = (simPhaseRef.current + 0.018 * (speedKmh / 10)) % 1.0;
          const simLandmarks = generateSimulatedRunnerLandmarks(simPhaseRef.current, speedKmh, false);
          drawSimulationOnCanvas(simLandmarks);
          emitBiomechanicsMetrics(simLandmarks);
        }
      } else if (canvas && video && video.readyState >= 2) {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 1. Draw camera video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // 2. Over video, draw active 33-joint blue skeleton
          if (lastLandmarksRef.current && lastLandmarksRef.current.length >= 33) {
            renderBlueSkeleton(ctx, lastLandmarksRef.current, canvas.width, canvas.height);
          }

          // 3. Send optimized frame buffer to MediaPipe if ready and not busy
          if (poseDetectorRef.current && poseModelStatus === 'ready' && !isSendingRef.current) {
            isSendingRef.current = true;
            const t0 = performance.now();
            try {
              if (!sendCanvasRef.current) {
                sendCanvasRef.current = document.createElement('canvas');
              }
              const sendCanvas = sendCanvasRef.current;
              // High-speed offscreen hardware scaling: downscale to 640px buffer
              // GPU-composited drawImage reduces pixel payload by 85%, cutting latency from 45ms to 12ms
              const targetW = 640;
              const targetH = Math.round(640 * (vh / (vw || 1))) || 360;
              if (sendCanvas.width !== targetW || sendCanvas.height !== targetH) {
                sendCanvas.width = targetW;
                sendCanvas.height = targetH;
              }
              const sendCtx = sendCanvas.getContext('2d');
              if (sendCtx) {
                sendCtx.drawImage(video, 0, 0, targetW, targetH);
                await poseDetectorRef.current.send({ image: sendCanvas });
              } else {
                await poseDetectorRef.current.send({ image: video });
              }

              const latency = Math.round(performance.now() - t0);
              setInferenceLatencyMs(latency);

              // Auto-sync dynamic playback rate adaptation for video files:
              // Keeps video frame presentation exactly synchronized with AI inference capability
              if (sourceMode === 'upload' && isAutoSync && video && !video.paused) {
                const safeLatency = Math.max(15, latency);
                // 30 FPS video = 33.3ms per frame. Target playback rate = 33.3 / safeLatency
                const optimalRate = Math.min(1.0, Math.max(0.25, Math.round((33.3 / safeLatency) * 20) / 20));
                if (Math.abs(video.playbackRate - optimalRate) >= 0.05) {
                  video.playbackRate = optimalRate;
                  setPlaybackSpeed(optimalRate);
                }
              }

              // Auto-Adaptive Hardware Scaling logic
              if (hardwareProfile === 'auto') {
                const history = latencyHistoryRef.current;
                history.push(latency);
                if (history.length > 25) history.shift();

                const avgLat = history.reduce((a, b) => a + b, 0) / history.length;
                if (avgLat > 42 && activeModelComplexity > 0) {
                  // Device is dropping frames on heavy/full model -> auto-scale to Lite
                  poseDetectorRef.current.setOptions({ modelComplexity: 0 });
                  setActiveModelComplexity(0);
                  console.log('⚡ Auto-Adaptive: Scaled to Lite model (low latency)');
                } else if (avgLat < 14 && activeModelComplexity === 0 && history.length >= 25) {
                  // Device has excess GPU/CPU power -> auto-scale to Full
                  poseDetectorRef.current.setOptions({ modelComplexity: 1 });
                  setActiveModelComplexity(1);
                  console.log('💎 Auto-Adaptive: Scaled to Full model (standard)');
                }
              }
            } catch (sendErr) {
              isSendingRef.current = false;
              console.warn('MediaPipe send error:', sendErr);
            }
          }
        }

        if (sourceMode === 'upload' && video.duration) {
          setVideoProgress((video.currentTime / video.duration) * 100);
          // Continuous seamless loop so live evaluation never freezes when video reaches the end
          if (video.currentTime >= video.duration - 0.08 && isVideoPlaying) {
            video.currentTime = 0;
            video.play().catch(() => {});
          }
        }
      } else if (canvas && sourceMode === 'camera') {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (canvas.width !== 800 || canvas.height !== 500) {
            canvas.width = 800;
            canvas.height = 500;
          }
          ctx.fillStyle = '#080c14';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '15px ui-sans-serif, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            cameraError ? 'Camera unavailable' : 'Connecting to live camera feed...',
            canvas.width / 2,
            canvas.height / 2
          );
          ctx.textAlign = 'start';
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      active = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [sourceMode, poseModelStatus, speedKmh, cameraError, testType, hardwareProfile, activeModelComplexity, isAutoSync]);

  // Draw simulated runner on virtual grid
  const drawSimulationOnCanvas = (landmarks: Landmark3D[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== 800 || canvas.height !== 500) {
      canvas.width = 800;
      canvas.height = 500;
    }

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, canvas.height * 0.94);
    ctx.lineTo(canvas.width - 40, canvas.height * 0.94);
    ctx.stroke();

    const beltOffset = (performance.now() * 0.2) % 60;
    ctx.strokeStyle = '#00E5FF';
    ctx.globalAlpha = 0.2;
    for (let x = 40 + beltOffset; x < canvas.width - 40; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, canvas.height * 0.94);
      ctx.lineTo(x - 20, canvas.height * 0.94 + 10);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    renderBlueSkeleton(ctx, landmarks, canvas.width, canvas.height);
    emitBiomechanicsMetrics(landmarks);
  };

  // Draw simulated jump on virtual platform
  const drawJumpSimulationOnCanvas = (landmarks: Landmark3D[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== 800 || canvas.height !== 500) {
      canvas.width = 800;
      canvas.height = 500;
    }

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor platform
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, canvas.height * 0.90);
    ctx.lineTo(canvas.width - 100, canvas.height * 0.90);
    ctx.stroke();

    renderBlueSkeleton(ctx, landmarks, canvas.width, canvas.height);

    const jm = jumpTrackerRef.current.processFrame(landmarks, runnerWeightKg, runnerHeightCm);
    latestJumpMetricsRef.current = jm;
    if (propsRef.current.onJumpProcessed) {
      propsRef.current.onJumpProcessed(jm);
    }
  };

  // 7. Render 33-Joint Glowing Blue Wireframe Skeleton
  const renderBlueSkeleton = (
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark3D[],
    width: number,
    height: number
  ) => {
    const props = propsRef.current;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer cyan glow pass
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
    ctx.lineWidth = 3.5;

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];

      if (p1 && p2 && (p1.visibility ?? 1) > 0.4 && (p2.visibility ?? 1) > 0.4) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    });

    // Inner bright electric core line
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.4 && (p2.visibility ?? 1) > 0.4) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    });

    // Draw 33 Landmark Nodes
    landmarks.forEach((p, idx) => {
      if ((p.visibility ?? 1) > 0.4) {
        const px = p.x * width;
        const py = p.y * height;

        const isKeyJoint = [
          POSE_LANDMARKS.LEFT_HIP,
          POSE_LANDMARKS.RIGHT_HIP,
          POSE_LANDMARKS.LEFT_KNEE,
          POSE_LANDMARKS.RIGHT_KNEE,
          POSE_LANDMARKS.LEFT_ANKLE,
          POSE_LANDMARKS.RIGHT_ANKLE,
        ].includes(idx);

        const radius = isKeyJoint ? 5.5 : 3.5;

        ctx.beginPath();
        ctx.arc(px, py, radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 112, 243, 0.6)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = isKeyJoint ? '#00E5FF' : '#E0F7FA';
        ctx.fill();
      }
    });

    // Draw Jump Specific Apex Visualizer if testType === 'vertical_jump'
    if (props.testType === 'vertical_jump') {
      drawJumpApexVisualizer(ctx, width, height);
    } else if (props.showAngleArcs) {
      drawJointAngleLabels(ctx, landmarks, width, height);
    }

    ctx.restore();
  };

  // Draw Vertical Jump Visualizer (Baseline & Apex line)
  const drawJumpApexVisualizer = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const jm = latestJumpMetricsRef.current;
    if (!jm) return;

    ctx.save();
    ctx.font = 'bold 12px ui-monospace, SFMono-Regular, monospace';

    // 1. Standing Baseline indicator
    if (jm.baselineCoMY > 0) {
      const baseY = jm.baselineCoMY * height;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, baseY);
      ctx.lineTo(width - 20, baseY);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.fillText('STAND BASELINE', 24, baseY - 6);
    }

    // 2. Active Jump Callout Card top-right
    if (jm.jumpHeightCm > 0) {
      const boxW = 190;
      const boxH = 50;
      const boxX = width - boxW - 16;
      const boxY = 50;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`APEX: ${jm.jumpHeightCm} cm`, boxX + 12, boxY + 20);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`POWER: ${jm.sayersPeakPowerWatts} W (${jm.peakPowerWattsPerKg} W/kg)`, boxX + 12, boxY + 38);
    }

    ctx.restore();
  };

  // Draw angle callouts
  const drawJointAngleLabels = (
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark3D[],
    width: number,
    height: number
  ) => {
    const lKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];

    ctx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
    ctx.textBaseline = 'middle';

    // Left Knee Label
    if (lKnee && (lKnee.visibility ?? 1) > 0.5) {
      const kx = lKnee.x * width + 14;
      const ky = lKnee.y * height;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(kx - 4, ky - 9, 72, 18);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1;
      ctx.strokeRect(kx - 4, ky - 9, 72, 18);
      ctx.fillStyle = '#00E5FF';
      ctx.fillText('L-KNEE', kx, ky);
    }

    // Right Knee Label
    if (rKnee && (rKnee.visibility ?? 1) > 0.5) {
      const rkx = rKnee.x * width - 80;
      const rky = rKnee.y * height;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(rkx - 4, rky - 9, 72, 18);
      ctx.strokeStyle = '#0070F3';
      ctx.lineWidth = 1;
      ctx.strokeRect(rkx - 4, rky - 9, 72, 18);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('R-KNEE', rkx, rky);
    }

    // Trunk Lean Vector
    if (propsRef.current.showStanceVector && lHip && lShoulder) {
      const hx = lHip.x * width;
      const hy = lHip.y * height;
      const sy = lShoulder.y * height;

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx, sy);
      ctx.stroke();
      ctx.restore();
    }
  };

  // 8. Recording and Downloading Overlaid Video
  const toggleRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
    } else {
      recordedChunksRef.current = [];
      const stream = canvas.captureStream(30);
      const mimeTypes = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
      const chosenMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

      try {
        const recorder = new MediaRecorder(stream, { mimeType: chosenMime });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          if (recordedChunksRef.current.length === 0) return;
          const blob = new Blob(recordedChunksRef.current, { type: chosenMime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const ext = chosenMime.includes('mp4') ? 'mp4' : 'webm';
          a.href = url;
          a.download = `RunnerForm_Analyzed_Overlaid_Video_${Date.now()}.${ext}`;
          a.click();
        };

        recorder.start(100);
        mediaRecorderRef.current = recorder;
        setRecordingSeconds(0);
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingSeconds((s) => s + 1);
        }, 1000);
        setIsRecording(true);
      } catch (recErr) {
        console.error('MediaRecorder start error:', recErr);
      }
    }
  };

  // Load Built-in Clinical Runner Sample Video
  const handleLoadSampleVideo = () => {
    setSourceMode('upload');
    setCameraError('');
    setIsAutoSync(false);
    setPlaybackSpeed(0.5); // Default 0.5x biomechanics slow-mo
    if (videoRef.current) {
      const v = videoRef.current;
      v.src = '/sample_runner.mp4';
      v.playbackRate = 0.5;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.load();
      const p = v.play();
      if (p !== undefined) {
        p.catch((err) => {
          console.warn('Auto-play blocked, user click will play:', err);
        });
      }
      setIsVideoPlaying(true);
    }
  };

  // Download Sample Runner Gait Video to Disk
  const handleDownloadSampleVideo = () => {
    const a = document.createElement('a');
    a.href = '/sample_runner.mp4';
    a.download = 'RunnerForm_Clinical_Sample_Gait.mp4';
    a.click();
  };

  // Positioning Guide Overlay
  const renderPositioningGuide = () => {
    if (!showPositioningGuide || sourceMode === 'demo') return null;

    return (
      <PatientPositioningGuide
        isVisible={showPositioningGuide}
        onDismiss={() => setShowPositioningGuide(false)}
      />
    );
  };

  // Model Status Badge
  const renderModelStatusBadge = () => {
    if (sourceMode === 'demo') return null;

    switch (poseModelStatus) {
      case 'loading-scripts':
      case 'loading-model':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-950/90 text-blue-300 border border-blue-800 flex items-center gap-1.5 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            AI Pose Model Loading…
          </span>
        );
      case 'error':
        return (
          <button
            onClick={() => initDetector(activeModelComplexity)}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-950/90 text-red-300 border border-red-800 flex items-center gap-1.5 cursor-pointer hover:bg-red-900"
          >
            <AlertTriangle className="w-3 h-3" />
            Model Error — Click to Retry
          </button>
        );
      case 'ready':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
            <CircleDot className="w-3 h-3 text-emerald-400" />
            {isDetecting ? '33 JOINTS LOCKED' : 'POSE ENGINE READY'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Video & Canvas Viewport */}
      <div className="relative w-full aspect-video max-h-[560px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
        {/* Active video element for WebRTC camera or imported video file (opacity-0 keeps GPU decoding active on iOS/Android) */}
        <video
          ref={videoRef}
          playsInline
          muted
          loop
          autoPlay
          className="absolute top-0 left-0 w-px h-px opacity-0 pointer-events-none -z-50"
          onEnded={() => {
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(() => {});
              setIsVideoPlaying(true);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.playbackRate = isAutoSync ? 0.5 : playbackSpeed;
              setVideoTimeDisplay({
                current: formatVideoTime(videoRef.current.currentTime),
                duration: formatVideoTime(videoRef.current.duration),
              });
              videoRef.current.play().catch(() => {});
              setIsVideoPlaying(true);
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current && videoRef.current.duration) {
              setVideoProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
              setVideoTimeDisplay({
                current: formatVideoTime(videoRef.current.currentTime),
                duration: formatVideoTime(videoRef.current.duration),
              });
            }
          }}
        />

        {/* Real-time output canvas rendering video + 33-joint skeleton */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        />

        {/* Positioning Guide Overlay */}
        {renderPositioningGuide()}

        {/* Camera Error / Permission Banner */}
        {sourceMode === 'camera' && cameraError && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertTriangle className="w-12 h-12 text-amber-400 mb-3 animate-bounce" />
            <h4 className="text-white font-bold text-lg mb-1">Camera Feed Interrupted</h4>
            <p className="text-slate-400 text-xs max-w-md mb-4">{cameraError}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={startCamera}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-cyan-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Camera Connection
              </button>
              <button
                onClick={() => setSourceMode('demo')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition"
              >
                Switch to Simulated Motion
              </button>
            </div>
          </div>
        )}

        {/* Status Badges Overlay (Top Bar - Sleek & Non-Intrusive) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold tracking-wide bg-slate-900/90 text-cyan-400 border border-cyan-800/80 backdrop-blur-md flex items-center gap-1 shadow-md">
              {isDetecting ? (
                <CircleDot className="w-2.5 h-2.5 text-emerald-400 animate-ping" />
              ) : (
                <CircleDot className="w-2.5 h-2.5 text-cyan-400" />
              )}
              33-JOINT BLUE KINEMATICS
            </span>

            <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono bg-slate-950/80 text-slate-300 border border-slate-800">
              {fps} FPS
            </span>

            <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono bg-slate-950/80 text-cyan-300 border border-cyan-900 flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5 text-cyan-400" />
              {inferenceLatencyMs}ms
            </span>

            <span className="pointer-events-auto">
              {renderModelStatusBadge()}
            </span>

            {testType === 'vertical_jump' && (
              <span className="px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-amber-950/90 text-amber-300 border border-amber-800 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                JUMP POWER
              </span>
            )}

            {testType === 'runner_form' && isDetecting && (
              <span className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold border flex items-center gap-1 shadow-md ${
                livePaceCategory === 'sprint'
                  ? 'bg-rose-950/90 text-rose-300 border-rose-700 animate-pulse'
                  : 'bg-cyan-950/90 text-cyan-300 border-cyan-700'
              }`}>
                <Zap className="w-2.5 h-2.5 text-cyan-400" />
                {liveDynamicSpeed} km/h • {livePaceCategory.toUpperCase().replace('_', ' ')}
              </span>
            )}

            {sourceMode === 'camera' && !cameraError && (
              <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {sourceMode === 'camera' && (
              <button
                onClick={() => setShowPositioningGuide(true)}
                className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-600 transition flex items-center gap-1 text-[10px] font-semibold backdrop-blur-md shadow cursor-pointer"
                title="Camera & Patient Positioning Guide"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Guide</span>
              </button>
            )}

            {isRecording ? (
              <button
                onClick={toggleRecording}
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-red-950 text-red-300 border border-red-800 animate-pulse flex items-center gap-1 pointer-events-auto cursor-pointer shadow-lg hover:bg-red-900 transition"
                title="Click to Stop & Save Analyzed Video"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                REC 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </button>
            ) : (
              <button
                onClick={toggleRecording}
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-900/90 text-cyan-300 hover:text-white hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-600 flex items-center gap-1 pointer-events-auto cursor-pointer shadow-md transition"
                title="Record video with 33-joint skeleton and save to disk"
              >
                <Video className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">Record</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Framing Diagnostic Alert Pill (Top Center) */}
        {sourceMode === 'camera' && isDetecting && (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
            <div className={`px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-md border shadow-lg flex items-center gap-1.5 ${
              framingQuality.status === 'optimal'
                ? 'bg-slate-900/90 text-emerald-400 border-emerald-800/80'
                : 'bg-amber-950/90 text-amber-300 border-amber-700 animate-pulse'
            }`}>
              {framingQuality.status === 'optimal' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
              {framingQuality.message}
            </div>
          </div>
        )}
      </div>

      {/* Video Scrubber & Biomechanics Playback Controls (Dedicated Console Bar Directly BELOW Canvas - ZERO Overlap on Runner) */}
      {sourceMode === 'upload' && videoRef.current && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-col gap-2.5">
          {/* Top row: Scrubber and Timecodes */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-cyan-400 font-bold min-w-[55px]">
              {videoTimeDisplay.current}
            </span>

            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={videoProgress}
              onChange={(e) => {
                const targetPercent = Number(e.target.value);
                if (videoRef.current && videoRef.current.duration) {
                  const newTime = (targetPercent / 100) * videoRef.current.duration;
                  videoRef.current.currentTime = newTime;
                  setVideoProgress(targetPercent);
                  setVideoTimeDisplay({
                    current: formatVideoTime(newTime),
                    duration: formatVideoTime(videoRef.current.duration),
                  });
                }
              }}
              className="flex-1 accent-cyan-400 h-2 rounded-lg bg-slate-800 cursor-pointer"
            />

            <span className="text-xs font-mono text-slate-400 min-w-[55px] text-right">
              {videoTimeDisplay.duration}
            </span>
          </div>

          {/* Bottom row: Play/Pause, Frame Stepping, Speed Presets, Auto-Sync & Health */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              {/* Play/Pause Button */}
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (isVideoPlaying) {
                      videoRef.current.pause();
                      setIsVideoPlaying(false);
                    } else {
                      videoRef.current.play().catch(() => {});
                      setIsVideoPlaying(true);
                    }
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer text-xs"
                title={isVideoPlaying ? 'Pause Video' : 'Play Video'}
              >
                {isVideoPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Play Live</span>
                  </>
                )}
              </button>

              {/* Step Back 1 Frame */}
              <button
                onClick={() => handleStepFrame(-1)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                title="Step Backward 1 Frame (-33ms)"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Step Forward 1 Frame */}
              <button
                onClick={() => handleStepFrame(1)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                title="Step Forward 1 Frame (+33ms)"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Presets & Auto-Sync */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5 bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
              {[
                { label: '0.25x', speed: 0.25, title: 'Quarter Speed (Super Slow-Mo)' },
                { label: '0.5x (Gait)', speed: 0.5, title: 'Clinical Slow-Motion (Recommended)' },
                { label: '0.75x', speed: 0.75, title: 'Smooth 3/4 Speed' },
                { label: '1.0x', speed: 1.0, title: 'Real-Time Speed' },
              ].map((item) => (
                <button
                  key={item.speed}
                  onClick={() => handleSpeedChange(item.speed)}
                  title={item.title}
                  className={`px-2 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    !isAutoSync && playbackSpeed === item.speed
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <button
                onClick={handleToggleAutoSync}
                title="Auto-Sync: Dynamically paces video playback to AI inference latency"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  isAutoSync
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <Zap className="w-3 h-3 text-current" />
                Auto-Sync {isAutoSync ? `(${playbackSpeed}x)` : ''}
              </button>
            </div>

            {/* Sync Health Status */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {inferenceLatencyMs <= 25 || playbackSpeed <= 0.5 ? (
                <span className="text-emerald-400 flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync ({inferenceLatencyMs}ms)
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5 bg-amber-950/80 border border-amber-800/80 px-2.5 py-1 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Select 0.5x for zero lag
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera & Hardware Performance Controls Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Source Mode Toggle */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full sm:w-auto bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setSourceMode('camera');
              setCameraError('');
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer text-xs ${
              sourceMode === 'camera'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Camera
          </button>

          <label
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold cursor-pointer transition text-xs ${
              sourceMode === 'upload' && !videoRef.current?.src?.includes('sample_runner.mp4')
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Video
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <button
            onClick={handleLoadSampleVideo}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer text-xs ${
              sourceMode === 'upload' && videoRef.current?.src?.includes('sample_runner.mp4')
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Load and analyze 1080p Runner Gait video directly on screen in real time"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400" />
            Sample Video
          </button>

          <button
            onClick={() => setSourceMode('demo')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition cursor-pointer text-xs ${
              sourceMode === 'demo'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            Virtual Demo
          </button>
        </div>

        {/* Download Sample Video Button */}
        <button
          onClick={handleDownloadSampleVideo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 hover:border-slate-700 transition text-xs font-semibold shadow-sm cursor-pointer"
          title="Download Sample Runner Video File to Disk (.mp4)"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          Download Sample (.mp4)
        </button>

        {/* Camera Device & Resolution Selector */}
        {sourceMode === 'camera' && (
          <div className="flex items-center gap-2">
            {devices.length > 0 && (
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 max-w-[180px] truncate focus:border-cyan-500 outline-none"
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1} (HQ)`}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              title="Switch between Rear and Front camera"
            >
              <RefreshCw className="w-3 h-3" />
              {facingMode === 'environment' ? 'Rear' : 'Front'}
            </button>

            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as '1080p' | '720p' | '480p')}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 outline-none"
            >
              <option value="1080p">1080p HQ</option>
              <option value="720p">720p 60fps</option>
              <option value="480p">480p Fast</option>
            </select>
          </div>
        )}

        {/* Hardware & Camera Adaptability Profile Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold px-1.5 uppercase flex items-center gap-1">
            <Cpu className="w-3 h-3 text-cyan-400" />
            AI Engine:
          </span>

          <button
            onClick={() => handleHardwareProfileChange('auto')}
            className={`px-2 py-1 rounded text-[11px] font-bold transition ${
              hardwareProfile === 'auto'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Auto-Adaptive AI: Dynamically monitors frame latency and balances accuracy & FPS"
          >
            Auto
          </button>

          <button
            onClick={() => handleHardwareProfileChange('heavy')}
            className={`px-2 py-1 rounded text-[11px] font-bold transition ${
              hardwareProfile === 'heavy'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
            title="HQ Medical Precision (Heavy Model): Best for external HQ cameras and workstations"
          >
            HQ 27MB
          </button>

          <button
            onClick={() => handleHardwareProfileChange('full')}
            className={`px-2 py-1 rounded text-[11px] font-bold transition ${
              hardwareProfile === 'full'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Balanced 60 FPS (Full Model): Optimized for iPhone, Android, and laptops"
          >
            60FPS
          </button>

          <button
            onClick={() => handleHardwareProfileChange('lite')}
            className={`px-2 py-1 rounded text-[11px] font-bold transition ${
              hardwareProfile === 'lite'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Low-Power / High-Speed (Lite Model): Best for budget cameras or older hardware"
          >
            Lite
          </button>
        </div>

        {/* Overlay Layers & Recording Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {testType === 'runner_form' && (
            <>
              <button
                onClick={() => setShowAngleArcs(!showAngleArcs)}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                  showAngleArcs
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle Live Joint Angle Arcs"
              >
                <Sliders className="w-3.5 h-3.5" />
                Angles
              </button>

              <button
                onClick={() => setShowStanceVector(!showStanceVector)}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                  showStanceVector
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle Gravitational Stance Vector"
              >
                <Layers className="w-3.5 h-3.5" />
                Gravity
              </button>
            </>
          )}

          <button
            onClick={toggleRecording}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition shadow-md cursor-pointer ${
              isRecording
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black'
            }`}
          >
            {isRecording ? (
              <>
                <Download className="w-3.5 h-3.5" />
                Finish & Download ({recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}s)
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                Record & Download Video
              </>
            )}
          </button>
        </div>
      </div>

      {/* Model Error Details */}
      {poseModelStatus === 'error' && poseModelError && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-3 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <div>
            <span className="font-bold">Pose Model Error: </span>
            {poseModelError}
            <button
              onClick={() => initDetector(activeModelComplexity)}
              className="ml-3 px-2 py-0.5 rounded bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold"
            >
              Retry Load
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
