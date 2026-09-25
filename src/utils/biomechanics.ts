import type { Landmark3D, JointAngles, FootStrikeType, PowerBreakdown } from '../types/runner';

// MediaPipe Pose Landmark Indices (33 Keypoints)
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// Anatomical connections for rendering (Blue lines)
export const POSE_CONNECTIONS: [number, number][] = [
  // Head & Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Torso
  [11, 12], // Shoulders
  [11, 23], // Left torso
  [12, 24], // Right torso
  [23, 24], // Hips (pelvic line)
  // Left Arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right Arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left Leg (Primary Runner Kinematics)
  [23, 25], // Hip to Knee
  [25, 27], // Knee to Ankle
  [27, 29], // Ankle to Heel
  [29, 31], // Heel to Toe
  [27, 31], // Ankle to Toe
  // Right Leg (Primary Runner Kinematics)
  [24, 26], // Hip to Knee
  [26, 28], // Knee to Ankle
  [28, 30], // Ankle to Heel
  [30, 32], // Heel to Toe
  [28, 32], // Ankle to Toe
];

/**
 * Calculates the angle formed by three 3D points (in degrees).
 * Vertex is point B.
 */
export function calculateAngle3D(a: Landmark3D, b: Landmark3D, c: Landmark3D): number {
  const ab = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
  const cb = {
    x: c.x - b.x,
    y: c.y - b.y,
    z: c.z - b.z,
  };

  const dotProduct = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y + ab.z * ab.z);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y + cb.z * cb.z);

  if (magAB === 0 || magCB === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dotProduct / (magAB * magCB)));
  const angleRad = Math.acos(cosAngle);
  return Math.round((angleRad * 180) / Math.PI);
}

/**
 * Calculates trunk forward lean relative to the gravitational vertical axis.
 * Normal optimal lean: 5 - 10 degrees.
 */
export function calculateTrunkLean(shoulder: Landmark3D, hip: Landmark3D): number {
  const dx = shoulder.x - hip.x;
  const dy = hip.y - shoulder.y; // In screen space, y is inverted (0 is top)
  if (dy === 0) return 0;
  const rad = Math.atan2(dx, dy);
  const deg = (rad * 180) / Math.PI;
  return Math.round(deg * 10) / 10;
}

/**
 * Calculates lateral pelvic tilt (Trendelenburg drop) between hips.
 */
export function calculatePelvicTilt(leftHip: Landmark3D, rightHip: Landmark3D): number {
  const dy = Math.abs(leftHip.y - rightHip.y);
  const dx = Math.abs(leftHip.x - rightHip.x);
  if (dx === 0) return 0;
  const rad = Math.atan2(dy, dx);
  const deg = (rad * 180) / Math.PI;
  return Math.round(deg * 10) / 10;
}

/**
 * Calculates dynamic knee valgus / varus angle (Q-angle collapse).
 * Measures frontal plane deviation of knee from the hip-ankle axis.
 */
export function calculateKneeValgus(hip: Landmark3D, knee: Landmark3D, ankle: Landmark3D): number {
  const lineX = hip.x + ((knee.y - hip.y) / (ankle.y - hip.y || 1)) * (ankle.x - hip.x);
  const lateralDeviation = (knee.x - lineX) * 100;
  return Math.round(lateralDeviation * 10) / 10;
}

/**
 * Calculates Foot Strike Angle (FSA in degrees) relative to horizontal surface.
 * > +8 deg: Rearfoot (Heel strike)
 * -1.5 to +8 deg: Midfoot strike
 * < -1.5 deg: Forefoot strike
 */
export function calculateFootStrikeAngle(heel: Landmark3D, toe: Landmark3D): { angleDeg: number; type: FootStrikeType } {
  const dx = Math.abs(toe.x - heel.x) || 0.001;
  const dy = heel.y - toe.y;
  const rad = Math.atan2(dy, dx);
  const angleDeg = Math.round(((rad * 180) / Math.PI) * 10) / 10;

  let type: FootStrikeType = 'midfoot';
  if (angleDeg > 7) {
    type = 'heel';
  } else if (angleDeg < -2) {
    type = 'forefoot';
  }

  return { angleDeg, type };
}

/**
 * Classifies foot strike type based on ankle, heel and toe relative inclination.
 */
export function classifyFootStrike(_ankle: Landmark3D, heel: Landmark3D, toe: Landmark3D): FootStrikeType {
  return calculateFootStrikeAngle(heel, toe).type;
}

/**
 * Estimates scale factor (pixels to centimeters) based on runner's actual height
 * and apparent height in normalized coordinates.
 */
export function estimateScaleFactor(landmarks: Landmark3D[], runnerHeightCm: number): number {
  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;

  const normalizedHeightSpan = Math.abs(avgAnkleY - nose.y);
  if (normalizedHeightSpan <= 0.05) return 1.0;

  return (runnerHeightCm * 0.88) / normalizedHeightSpan;
}

/**
 * Classifies joint angles from a 33-landmark pose array.
 */
export function extractJointAngles(landmarks: Landmark3D[]): JointAngles {
  const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const lElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const rElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const lWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const lKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const lToe = landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX];
  const rToe = landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX];

  // Knee Flexion: Hip - Knee - Ankle
  const leftKnee = calculateAngle3D(lHip, lKnee, lAnkle);
  const rightKnee = calculateAngle3D(rHip, rKnee, rAnkle);

  // Hip Flexion: Shoulder - Hip - Knee
  const leftHipAngle = calculateAngle3D(lShoulder, lHip, lKnee);
  const rightHipAngle = calculateAngle3D(rShoulder, rHip, rKnee);

  // Ankle Angle: Knee - Ankle - Toe
  const leftAnkleAngle = calculateAngle3D(lKnee, lAnkle, lToe);
  const rightAnkleAngle = calculateAngle3D(rKnee, rAnkle, rToe);

  // Arm Swing: Shoulder - Elbow - Wrist
  const leftArmSwing = calculateAngle3D(lShoulder, lElbow, lWrist);
  const rightArmSwing = calculateAngle3D(rShoulder, rElbow, rWrist);

  // Midpoints for trunk
  const midShoulder: Landmark3D = {
    x: (lShoulder.x + rShoulder.x) / 2,
    y: (lShoulder.y + rShoulder.y) / 2,
    z: (lShoulder.z + rShoulder.z) / 2,
  };
  const midHip: Landmark3D = {
    x: (lHip.x + rHip.x) / 2,
    y: (lHip.y + rHip.y) / 2,
    z: (lHip.z + rHip.z) / 2,
  };

  const trunkLean = calculateTrunkLean(midShoulder, midHip);
  const pelvicTilt = calculatePelvicTilt(lHip, rHip);
  const leftKneeValgus = calculateKneeValgus(lHip, lKnee, lAnkle);
  const rightKneeValgus = calculateKneeValgus(rHip, rKnee, rAnkle);

  return {
    leftKnee,
    rightKnee,
    leftHip: leftHipAngle,
    rightHip: rightHipAngle,
    leftAnkle: leftAnkleAngle,
    rightAnkle: rightAnkleAngle,
    trunkLean,
    pelvicTilt,
    leftArmSwing,
    rightArmSwing,
    leftKneeValgus,
    rightKneeValgus,
  };
}

/**
 * Calculates mechanical running power (Watts, W/kg, and detailed breakdown)
 * Using Minetti, van Dijk, and Cavagna kinetic models.
 */
export function calculateRunningPower(
  weightKg: number,
  speedKmh: number,
  verticalOscillationCm: number,
  cadenceSpm: number
): { watts: number; wattsPerKg: number; breakdown: PowerBreakdown } {
  const speedMs = speedKmh / 3.6;
  const stepFreqHz = Math.max(1, cadenceSpm / 60);
  const vertOscM = Math.max(0.04, verticalOscillationCm / 100);

  // 1. Vertical External Power against gravity
  const pVert = weightKg * 9.81 * vertOscM * stepFreqHz;

  // 2. Horizontal Forward Kinetic Power
  const pAero = 0.5 * 1.2 * 0.24 * Math.pow(speedMs, 3);
  const pHoriz = weightKg * speedMs * 0.95 + pAero;

  // 3. Internal Power (accelerating/decelerating limbs relative to body CoM)
  const pInternal = weightKg * (0.09 * Math.pow(stepFreqHz, 2) * Math.max(1, speedMs));

  const totalWatts = Math.round(pVert + pHoriz + pInternal);
  const wattsPerKg = Math.round((totalWatts / Math.max(30, weightKg)) * 10) / 10;

  return {
    watts: totalWatts,
    wattsPerKg,
    breakdown: {
      pVertWatts: Math.round(pVert),
      pHorizWatts: Math.round(pHoriz),
      pInternalWatts: Math.round(pInternal),
    },
  };
}

/**
 * Calculates Leg Spring Stiffness (K_leg in kN/m)
 */
export function calculateLegStiffness(
  weightKg: number,
  speedKmh: number,
  gctMs: number,
  verticalOscillationCm: number
): number {
  const speedMs = speedKmh / 3.6;
  const gctSec = Math.max(0.12, gctMs / 1000);
  const vertOscM = Math.max(0.03, verticalOscillationCm / 100);

  const fPeakNewtons = (Math.PI / 2) * weightKg * 9.81 * (0.4 / gctSec + 1);

  const legLengthM = 0.92;
  const halfContactAngle = (speedMs * gctSec) / (2 * legLengthM);
  const legCompressionM = vertOscM + legLengthM * (1 - Math.cos(halfContactAngle));

  const kLegKnM = (fPeakNewtons / (legCompressionM * 1000));
  return Math.round(Math.max(6, Math.min(32, kLegKnM)) * 10) / 10;
}

/**
 * Estimates Peak Ground Reaction Force in bodyweight multiples (x BW).
 */
export function estimateGroundReactionForce(
  _weightKg: number,
  gctMs: number,
  cadenceSpm: number
): number {
  const gctSec = Math.max(0.12, gctMs / 1000);
  const strideTimeSec = 60 / Math.max(120, cadenceSpm);
  const flightTimeSec = Math.max(0.06, strideTimeSec - gctSec);

  const grfRatio = (Math.PI / 2) * (flightTimeSec / gctSec + 1);
  return Math.round(Math.max(1.8, Math.min(4.5, grfRatio)) * 10) / 10;
}

// =========================================================================
// 1€ (One-Euro) Adaptive Low-Pass Filter for Anatomical Realism & Zero Jitter
// =========================================================================

class OneEuroScalarFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.04, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  public filter(x: number, t: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = t;
      this.dxPrev = 0;
      return x;
    }

    const dt = Math.max(1e-4, t - this.tPrev);
    this.tPrev = t;

    // Estimate derivative
    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    this.dxPrev = dxHat;

    // Dynamic cutoff: high speed = less filtering (no lag), low speed = heavy smoothing (no jitter)
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;

    return xHat;
  }

  public reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

export class OneEuroLandmarkFilter {
  private xFilters: OneEuroScalarFilter[] = [];
  private yFilters: OneEuroScalarFilter[] = [];
  private zFilters: OneEuroScalarFilter[] = [];

  constructor(minCutoff = 1.2, beta = 0.15, dCutoff = 1.0) {
    for (let i = 0; i < 33; i++) {
      this.xFilters.push(new OneEuroScalarFilter(minCutoff, beta, dCutoff));
      this.yFilters.push(new OneEuroScalarFilter(minCutoff, beta, dCutoff));
      this.zFilters.push(new OneEuroScalarFilter(minCutoff, beta, dCutoff));
    }
  }

  public filter(landmarks: Landmark3D[], timestampMs: number): Landmark3D[] {
    const t = timestampMs / 1000;
    return landmarks.map((lm, i) => {
      if (!lm || (lm.visibility ?? 1) < 0.3) return lm;
      return {
        x: this.xFilters[i].filter(lm.x, t),
        y: this.yFilters[i].filter(lm.y, t),
        z: this.zFilters[i].filter(lm.z, t),
        visibility: lm.visibility,
      };
    });
  }

  public reset() {
    this.xFilters.forEach((f) => f.reset());
    this.yFilters.forEach((f) => f.reset());
    this.zFilters.forEach((f) => f.reset());
  }
}

// =========================================================================
// Real-Time Camera Framing Quality & Distance Diagnostic
// =========================================================================

export interface FramingDiagnostic {
  status: 'optimal' | 'step_back' | 'tilt_up' | 'low_visibility' | 'too_close';
  visibilityPct: number;
  message: string;
}

export function evaluateFramingQuality(landmarks: Landmark3D[]): FramingDiagnostic {
  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  let visibleCount = 0;
  landmarks.forEach((p) => {
    if ((p.visibility ?? 1) > 0.45) visibleCount++;
  });
  const visibilityPct = Math.round((visibleCount / 33) * 100);

  if (visibilityPct < 60) {
    return {
      status: 'low_visibility',
      visibilityPct,
      message: 'Low lighting or poor contrast. Ensure diffuse front lighting.',
    };
  }

  if (lAnkle && rAnkle && (lAnkle.y > 0.96 || rAnkle.y > 0.96)) {
    return {
      status: 'step_back',
      visibilityPct,
      message: 'Feet clipped at bottom edge. Step back ~0.5m.',
    };
  }

  if (nose && nose.y < 0.05) {
    return {
      status: 'tilt_up',
      visibilityPct,
      message: 'Head clipped at top edge. Tilt camera slightly upward.',
    };
  }

  const heightSpan = Math.abs(((lAnkle?.y || 0.9) + (rAnkle?.y || 0.9)) / 2 - (nose?.y || 0.2));
  if (heightSpan > 0.92) {
    return {
      status: 'too_close',
      visibilityPct,
      message: 'Too close to camera. Move back to 2.5m distance.',
    };
  }

  return {
    status: 'optimal',
    visibilityPct,
    message: 'Full Body Locked (Optimal Sagittal Framing)',
  };
}
