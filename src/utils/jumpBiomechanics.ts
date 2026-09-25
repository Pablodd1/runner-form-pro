import type { Landmark3D, VerticalJumpMetrics } from '../types/runner';
import { POSE_LANDMARKS, estimateScaleFactor } from './biomechanics';

/**
 * Vertical Jump & Explosive Power Kinematic Analyzer
 * Implements:
 * 1. CoM (Center of Mass) tracking using pelvic midpoint & trunk centroid
 * 2. Flight time calculation: h = (1/8) * g * (t_flight)^2
 * 3. Takeoff velocity: v0 = sqrt(2 * g * h)
 * 4. Sayers Peak Power Formula: Power (W) = 60.7 * h (cm) + 45.3 * mass (kg) - 2055
 * 5. Harman Peak Power Formula: Power (W) = 61.9 * h (cm) + 36.0 * mass (kg) + 1822
 * 6. Reactive Strength Index (RSI) for drop jumps and plyometrics
 */

export class JumpBiomechanicsTracker {
  private baselineCoMY: number = 0;
  private baselineSamples: number = 0;
  private isCalibrated: boolean = false;
  private currentPhase: 'standing' | 'eccentric_dip' | 'propulsion' | 'flight' | 'landing' = 'standing';

  private dipMinY: number = 0; // In inverted screen coords, higher Y = lower physical position
  private takeoffTime: number = 0;
  private landingTime: number = 0;
  private apexY: number = 0;

  // History of completed jumps
  public completedJumps: {
    heightCm: number;
    flightTimeMs: number;
    sayersWatts: number;
    harmanWatts: number;
    wattsPerKg: number;
    takeoffVelocity: number;
    rsi: number;
    timestamp: number;
  }[] = [];

  public resetBaseline() {
    this.baselineCoMY = 0;
    this.baselineSamples = 0;
    this.isCalibrated = false;
    this.currentPhase = 'standing';
    this.completedJumps = [];
  }

  /**
   * Process a single video frame containing 33 landmarks
   */
  public processFrame(
    landmarks: Landmark3D[],
    weightKg: number,
    heightCm: number
  ): VerticalJumpMetrics {
    const now = performance.now();
    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    // Estimate Center of Mass Y (pelvis midpoint heavily weighted + shoulder midpoint)
    const hipMidY = (lHip.y + rHip.y) / 2;
    const shoulderMidY = (lShoulder.y + rShoulder.y) / 2;
    const currentCoMY = hipMidY * 0.7 + shoulderMidY * 0.3;

    // Estimate foot contact via ankle Y (in normalized coords, higher Y = lower on floor)
    const avgAnkleY = (lAnkle.y + rAnkle.y) / 2;

    const scaleFactor = estimateScaleFactor(landmarks, heightCm);

    // Phase 1: Calibration (first 30 frames of quiet standing)
    if (!this.isCalibrated) {
      this.baselineCoMY += currentCoMY;
      this.baselineSamples++;
      if (this.baselineSamples >= 25) {
        this.baselineCoMY /= this.baselineSamples;
        this.isCalibrated = true;
      }
      return this.createMetricsResult(0, 0, 0, 0, 0, 0, 0, 0, currentCoMY);
    }

    // Displacement from standing baseline in normalized units (positive = upward)
    const upwardDispNorm = this.baselineCoMY - currentCoMY;
    const dispCm = upwardDispNorm * scaleFactor;

    // State machine for jump phase detection
    // Thresholds:
    // Dip: CoM drops below baseline by > 6 cm (upwardDispNorm < -0.03)
    // Flight: CoM rises above baseline AND ankles lift off (> 5 cm above baseline foot position)
    const isDip = dispCm < -5;
    const isAirborne = dispCm > 8 && (this.baselineCoMY - avgAnkleY) * scaleFactor > 6;

    if (this.currentPhase === 'standing') {
      if (isDip) {
        this.currentPhase = 'eccentric_dip';
        this.dipMinY = dispCm;
      } else if (isAirborne) {
        this.currentPhase = 'flight';
        this.takeoffTime = now;
        this.apexY = dispCm;
      }
    } else if (this.currentPhase === 'eccentric_dip') {
      if (dispCm < this.dipMinY) {
        this.dipMinY = dispCm; // deeper squat
      }
      if (dispCm > -2) {
        this.currentPhase = 'propulsion';
      }
    } else if (this.currentPhase === 'propulsion') {
      if (isAirborne) {
        this.currentPhase = 'flight';
        this.takeoffTime = now;
        this.apexY = dispCm;
      } else if (dispCm < -4) {
        this.currentPhase = 'eccentric_dip';
      }
    } else if (this.currentPhase === 'flight') {
      if (dispCm > this.apexY) {
        this.apexY = dispCm; // Tracking maximum height
      }

      // Check for landing (ankles return near floor level or CoM drops below threshold)
      if (!isAirborne && dispCm < 6 && now - this.takeoffTime > 150) {
        this.currentPhase = 'landing';
        this.landingTime = now;

        const flightTimeMs = Math.max(100, Math.min(1200, this.landingTime - this.takeoffTime));
        const flightTimeSec = flightTimeMs / 1000;

        // Jump height from flight time: h = 0.5 * g * (t/2)^2 = (1/8) * g * t^2
        const heightFromFlightCm = (1 / 8) * 9.81 * Math.pow(flightTimeSec, 2) * 100;
        // Blend flight time estimate with direct kinematic CoM tracking
        const calculatedHeightCm = Math.round(
          Math.max(10, (heightFromFlightCm * 0.6 + Math.max(10, this.apexY) * 0.4) * 10)
        ) / 10;

        // Takeoff velocity: v0 = sqrt(2 * g * h)
        const v0 = Math.round(Math.sqrt(2 * 9.81 * (calculatedHeightCm / 100)) * 100) / 100;

        // Sayers Peak Power (Watts) = 60.7 * h (cm) + 45.3 * weight (kg) - 2055
        const sayers = Math.round(
          Math.max(300, 60.7 * calculatedHeightCm + 45.3 * weightKg - 2055)
        );

        // Harman Peak Power (Watts) = 61.9 * h (cm) + 36.0 * weight (kg) + 1822
        const harman = Math.round(
          Math.max(400, 61.9 * calculatedHeightCm + 36.0 * weightKg + 1822)
        );

        const wPerKg = Math.round((sayers / weightKg) * 10) / 10;

        // RSI = Jump Height (m) / Contact Time (s) or Flight Time / Dip Time
        const dipDurationSec = Math.max(0.2, (this.takeoffTime - (now - 500)) / 1000);
        const rsi = Math.round((flightTimeSec / dipDurationSec) * 100) / 100;

        this.completedJumps.push({
          heightCm: calculatedHeightCm,
          flightTimeMs: Math.round(flightTimeMs),
          sayersWatts: sayers,
          harmanWatts: harman,
          wattsPerKg: wPerKg,
          takeoffVelocity: v0,
          rsi,
          timestamp: Date.now(),
        });
      }
    } else if (this.currentPhase === 'landing') {
      if (Math.abs(dispCm) < 3) {
        this.currentPhase = 'standing';
      }
    }

    const latestJump = this.completedJumps[this.completedJumps.length - 1];

    return this.createMetricsResult(
      latestJump ? latestJump.heightCm : Math.max(0, Math.round(dispCm * 10) / 10),
      latestJump ? latestJump.flightTimeMs : (this.currentPhase === 'flight' ? Math.round(now - this.takeoffTime) : 0),
      latestJump ? latestJump.takeoffVelocity : 0,
      latestJump ? latestJump.sayersWatts : 0,
      latestJump ? latestJump.harmanWatts : 0,
      latestJump ? latestJump.wattsPerKg : 0,
      Math.abs(Math.round(this.dipMinY * 10) / 10),
      latestJump ? latestJump.rsi : 0,
      currentCoMY
    );
  }

  private createMetricsResult(
    heightCm: number,
    flightTimeMs: number,
    takeoffVelocityMs: number,
    sayersWatts: number,
    harmanWatts: number,
    wPerKg: number,
    dipCm: number,
    rsi: number,
    currentCoMY: number
  ): VerticalJumpMetrics {
    return {
      timestamp: Date.now(),
      jumpPhase: this.currentPhase,
      jumpHeightCm: heightCm,
      flightTimeMs,
      takeoffVelocityMs,
      sayersPeakPowerWatts: sayersWatts,
      harmanPeakPowerWatts: harmanWatts,
      peakPowerWattsPerKg: wPerKg,
      countermovementDepthCm: dipCm,
      reactiveStrengthIndex: rsi,
      currentCoMY,
      baselineCoMY: this.baselineCoMY,
    };
  }
}
