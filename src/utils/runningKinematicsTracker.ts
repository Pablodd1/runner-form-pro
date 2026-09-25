import type { Landmark3D, FootStrikeType, PowerBreakdown } from '../types/runner';
import { POSE_LANDMARKS, estimateScaleFactor, calculateFootStrikeAngle, extractJointAngles, calculateRunningPower, calculateLegStiffness, estimateGroundReactionForce } from './biomechanics';

export type GaitPaceCategory = 'recovery' | 'aerobic_jog' | 'tempo' | 'fast_run' | 'sprint';

export interface DynamicGaitFrameResult {
  instantaneousSpeedKmh: number;
  cadenceSpm: number;
  verticalOscillationCm: number;
  groundContactTimeMs: number;
  dutyFactorPct: number;
  strideLengthM: number;
  runningEconomyRatio: number;
  legStiffnessKnM: number;
  groundReactionForceBw: number;
  powerWatts: number;
  powerWattsPerKg: number;
  powerBreakdown: PowerBreakdown;
  gaitPaceCategory: GaitPaceCategory;
  footStrikeAngleDeg: number;
  leftFootStrike: FootStrikeType;
  rightFootStrike: FootStrikeType;
  peakSwingKneeFlexionDeg: number;
  overstrideDistanceCm: number;
}

interface FrameRecord {
  timeMs: number;
  comY: number;
  leftAnkleY: number;
  rightAnkleY: number;
  leftAnkleX: number;
  rightAnkleX: number;
  leftKneeFlexion: number;
  rightKneeFlexion: number;
}

/**
 * Dynamic Running Gait Kinematics Tracker
 * Continuously tracks step cycles, instantaneous cadence, adaptive speed transitions
 * (slow jog -> tempo -> fast run -> sprint), vertical oscillation, and ground contact mechanics.
 */
export class RunningGaitKinematicsTracker {
  private history: FrameRecord[] = [];
  private readonly maxHistoryMs = 2500; // 2.5 second rolling window

  // Step detection state
  private lastStepTimeMs: number = 0;
  private recentStepIntervalsMs: number[] = [];
  private lastDetectedLeg: 'left' | 'right' | null = null;
  private smoothedCadenceSpm: number = 164;
  private smoothedSpeedKmh: number = 10.0;
  private smoothedVertOscCm: number = 7.0;

  // Pace time breakdown (in seconds)
  public paceAccumulator = {
    recoverySeconds: 0,
    jogSeconds: 0,
    tempoSeconds: 0,
    sprintSeconds: 0,
    lastTickTimeMs: 0,
  };

  public reset() {
    this.history = [];
    this.lastStepTimeMs = 0;
    this.recentStepIntervalsMs = [];
    this.lastDetectedLeg = null;
    this.smoothedCadenceSpm = 164;
    this.smoothedSpeedKmh = 10.0;
    this.smoothedVertOscCm = 7.0;
    this.paceAccumulator = {
      recoverySeconds: 0,
      jogSeconds: 0,
      tempoSeconds: 0,
      sprintSeconds: 0,
      lastTickTimeMs: 0,
    };
  }

  /**
   * Process a single video frame containing 33 landmarks
   */
  public processFrame(
    landmarks: Landmark3D[],
    runnerWeightKg: number,
    runnerHeightCm: number,
    configuredTargetSpeedKmh: number,
    mode: 'treadmill' | 'street' | 'track'
  ): DynamicGaitFrameResult {
    const now = performance.now();
    const scaleFactor = estimateScaleFactor(landmarks, runnerHeightCm);
    const angles = extractJointAngles(landmarks);

    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    const lHeel = landmarks[POSE_LANDMARKS.LEFT_HEEL];
    const rHeel = landmarks[POSE_LANDMARKS.RIGHT_HEEL];
    const lToe = landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX];
    const rToe = landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX];

    // Center of Mass (CoM) vertical estimate
    const comY = ((lHip.y + rHip.y) / 2) * 0.7 + ((landmarks[POSE_LANDMARKS.LEFT_SHOULDER].y + landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].y) / 2) * 0.3;

    // Record frame
    this.history.push({
      timeMs: now,
      comY,
      leftAnkleY: lAnkle.y,
      rightAnkleY: rAnkle.y,
      leftAnkleX: lAnkle.x,
      rightAnkleX: rAnkle.x,
      leftKneeFlexion: angles.leftKnee,
      rightKneeFlexion: angles.rightKnee,
    });

    // Prune history older than maxHistoryMs
    const cutoff = now - this.maxHistoryMs;
    while (this.history.length > 0 && this.history[0].timeMs < cutoff) {
      this.history.shift();
    }

    // 1. Detect Steps & Real-Time Cadence
    this.detectStep(now);

    // 2. Measure Real-Time Vertical Oscillation from CoM trajectory
    let vertOscCm = this.calculateRealtimeVerticalOscillation(scaleFactor);
    if (vertOscCm < 3.0 || isNaN(vertOscCm)) vertOscCm = 6.8;
    this.smoothedVertOscCm = this.smoothedVertOscCm * 0.9 + vertOscCm * 0.1;

    // 3. Peak Knee Flexion during swing phase (hallmark of sprinting vs jogging)
    const maxKneeFlexion = Math.max(angles.leftKnee, angles.rightKnee);

    // 4. Stride Length & Dynamic Speed Adaptation
    const strideLengthM = this.calculateStrideLength(landmarks, scaleFactor);

    // Dynamic speed estimation:
    // Blend stride-frequency mechanics + swing knee amplitude + target baseline
    const dynamicSpeedKmh = this.estimateDynamicRunningSpeed(
      strideLengthM,
      this.smoothedCadenceSpm,
      maxKneeFlexion,
      configuredTargetSpeedKmh,
      mode
    );

    this.smoothedSpeedKmh = this.smoothedSpeedKmh * 0.85 + dynamicSpeedKmh * 0.15;
    const currentSpeed = Math.round(this.smoothedSpeedKmh * 10) / 10;
    const currentCadence = Math.round(this.smoothedCadenceSpm);
    const currentVertOsc = Math.round(this.smoothedVertOscCm * 10) / 10;

    // 5. Pace Classification
    const paceCategory = this.classifyPaceCategory(currentSpeed);
    this.updatePaceAccumulator(paceCategory, now);

    // 6. Ground Contact Time (ms) - dynamically scales inversely with speed
    // Fast sprinting: 130-160ms | Tempo: 180-220ms | Jogging: 240-280ms
    const speedMs = currentSpeed / 3.6;
    const estimatedGctMs = Math.round(
      Math.max(120, Math.min(320, 290 - speedMs * 16 + (170 - currentCadence) * 0.8))
    );

    const stepFreqHz = currentCadence / 60;
    const dutyFactorPct = Math.min(65, Math.round((estimatedGctMs / (1000 / stepFreqHz)) * 100));

    // 7. Mechanical Power Breakdown
    const { watts, wattsPerKg, breakdown } = calculateRunningPower(
      runnerWeightKg,
      currentSpeed,
      currentVertOsc,
      currentCadence
    );

    // 8. Leg Stiffness & Ground Reaction Force
    const legStiffnessKnM = calculateLegStiffness(
      runnerWeightKg,
      currentSpeed,
      estimatedGctMs,
      currentVertOsc
    );
    const groundReactionForceBw = estimateGroundReactionForce(
      runnerWeightKg,
      estimatedGctMs,
      currentCadence
    );

    // 9. Running Economy Waste Ratio: (vertOsc / strideLengthCm) * 100
    const strideLengthCm = strideLengthM * 100;
    const runningEconomyRatio = Math.round((currentVertOsc / Math.max(40, strideLengthCm)) * 1000) / 10;

    // 10. Foot Strike Angles
    const { angleDeg: footStrikeAngle, type: leftFootStrike } = calculateFootStrikeAngle(lHeel, lToe);
    const rightFootStrike = calculateFootStrikeAngle(rHeel, rToe).type;

    // 11. Overstride Distance
    const hipMidX = (lHip.x + rHip.x) / 2;
    const frontAnkleX = Math.max(lAnkle.x, rAnkle.x);
    const overstrideCm = Math.round(Math.max(0, (frontAnkleX - hipMidX) * scaleFactor * 0.4));

    return {
      instantaneousSpeedKmh: currentSpeed,
      cadenceSpm: currentCadence,
      verticalOscillationCm: currentVertOsc,
      groundContactTimeMs: estimatedGctMs,
      dutyFactorPct,
      strideLengthM: Math.round(strideLengthM * 100) / 100,
      runningEconomyRatio,
      legStiffnessKnM,
      groundReactionForceBw,
      powerWatts: watts,
      powerWattsPerKg: wattsPerKg,
      powerBreakdown: breakdown,
      gaitPaceCategory: paceCategory,
      footStrikeAngleDeg: footStrikeAngle,
      leftFootStrike,
      rightFootStrike,
      peakSwingKneeFlexionDeg: Math.round(maxKneeFlexion),
      overstrideDistanceCm: overstrideCm,
    };
  }

  /**
   * Peak detection on ankle vertical trajectory for real-time step identification
   */
  private detectStep(now: number) {
    if (this.history.length < 5) return;

    const n = this.history.length;
    const curr = this.history[n - 1];
    const prev = this.history[n - 2];
    const prev2 = this.history[n - 3];

    // Left Foot Strike: Left ankle reaches peak downward displacement (local max Y in screen space)
    const isLeftMax = prev.leftAnkleY > prev2.leftAnkleY && prev.leftAnkleY >= curr.leftAnkleY;
    // Right Foot Strike
    const isRightMax = prev.rightAnkleY > prev2.rightAnkleY && prev.rightAnkleY >= curr.rightAnkleY;

    // Refractory period: minimum 210ms between steps (~285 SPM max)
    const timeSinceLastStep = now - this.lastStepTimeMs;

    if (timeSinceLastStep > 210) {
      if (isLeftMax && this.lastDetectedLeg !== 'left') {
        this.registerStep(now, 'left');
      } else if (isRightMax && this.lastDetectedLeg !== 'right') {
        this.registerStep(now, 'right');
      }
    }
  }

  private registerStep(now: number, leg: 'left' | 'right') {
    if (this.lastStepTimeMs > 0) {
      const stepDurationMs = now - this.lastStepTimeMs;
      // Valid step duration: 210ms to 650ms (92 to 285 SPM)
      if (stepDurationMs >= 210 && stepDurationMs <= 650) {
        this.recentStepIntervalsMs.push(stepDurationMs);
        if (this.recentStepIntervalsMs.length > 6) {
          this.recentStepIntervalsMs.shift();
        }

        // Compute median step interval
        const sorted = [...this.recentStepIntervalsMs].sort((a, b) => a - b);
        const medianIntervalMs = sorted[Math.floor(sorted.length / 2)];
        const instantaneousCadence = (60 * 1000) / medianIntervalMs;

        // Smooth cadence
        this.smoothedCadenceSpm = this.smoothedCadenceSpm * 0.7 + instantaneousCadence * 0.3;
      }
    }

    this.lastStepTimeMs = now;
    this.lastDetectedLeg = leg;
  }

  /**
   * Real-time vertical oscillation amplitude from recent CoM history
   */
  private calculateRealtimeVerticalOscillation(scaleFactor: number): number {
    if (this.history.length < 15) return 7.0;

    let minY = Infinity;
    let maxY = -Infinity;

    // Inspect last 1.2 seconds of frames
    const recentCutoff = performance.now() - 1200;
    for (const frame of this.history) {
      if (frame.timeMs >= recentCutoff) {
        if (frame.comY < minY) minY = frame.comY;
        if (frame.comY > maxY) maxY = frame.comY;
      }
    }

    if (minY === Infinity || maxY === -Infinity) return 7.0;
    const amplitudeNorm = maxY - minY;
    return amplitudeNorm * scaleFactor;
  }

  /**
   * Calculates dynamic stride length from ankle horizontal spread
   */
  private calculateStrideLength(landmarks: Landmark3D[], scaleFactor: number): number {
    const lToe = landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX];
    const rToe = landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX];

    let maxFootSpreadNorm = Math.abs(lToe.x - rToe.x);
    for (const f of this.history) {
      const spread = Math.abs(f.leftAnkleX - f.rightAnkleX);
      if (spread > maxFootSpreadNorm) maxFootSpreadNorm = spread;
    }

    // Step length in meters (stride is 2 steps)
    const stepLengthM = (maxFootSpreadNorm * scaleFactor * 1.1) / 100;
    return Math.max(0.65, Math.min(2.5, stepLengthM * 2.0));
  }

  /**
   * Estimates dynamic speed by fusing stride-cadence mechanics with knee swing amplitude
   */
  private estimateDynamicRunningSpeed(
    strideLengthM: number,
    cadenceSpm: number,
    maxKneeFlexionDeg: number,
    targetSpeedKmh: number,
    _mode: 'treadmill' | 'street' | 'track'
  ): number {
    // 1. Kinematic speed = stride length * step frequency
    const stepFreqHz = cadenceSpm / 60;
    const kinematicSpeedKmh = (strideLengthM / 2) * stepFreqHz * 3.6;

    // 2. Sprint knee-drive factor: sprinters flex knee > 115° during swing phase
    let sprintBoostKmh = 0;
    if (maxKneeFlexionDeg > 105) {
      sprintBoostKmh = (maxKneeFlexionDeg - 105) * 0.15;
    }

    const estimatedDynamicSpeed = kinematicSpeedKmh + sprintBoostKmh;

    // Blend: 55% dynamic kinematic estimate + 45% target anchor
    const blendedSpeed = estimatedDynamicSpeed * 0.55 + targetSpeedKmh * 0.45;
    return Math.max(4.0, Math.min(32.0, blendedSpeed));
  }

  /**
   * Classifies current speed into athletic pace categories
   */
  private classifyPaceCategory(speedKmh: number): GaitPaceCategory {
    if (speedKmh < 7.5) return 'recovery';
    if (speedKmh < 10.5) return 'aerobic_jog';
    if (speedKmh < 14.0) return 'tempo';
    if (speedKmh < 18.0) return 'fast_run';
    return 'sprint';
  }

  /**
   * Accumulates time spent in each speed bracket for the final 60s summary
   */
  private updatePaceAccumulator(cat: GaitPaceCategory, now: number) {
    if (this.paceAccumulator.lastTickTimeMs === 0) {
      this.paceAccumulator.lastTickTimeMs = now;
      return;
    }

    const dtSeconds = (now - this.paceAccumulator.lastTickTimeMs) / 1000;
    this.paceAccumulator.lastTickTimeMs = now;

    if (dtSeconds > 0 && dtSeconds < 0.5) {
      if (cat === 'recovery') this.paceAccumulator.recoverySeconds += dtSeconds;
      else if (cat === 'aerobic_jog') this.paceAccumulator.jogSeconds += dtSeconds;
      else if (cat === 'tempo') this.paceAccumulator.tempoSeconds += dtSeconds;
      else this.paceAccumulator.sprintSeconds += dtSeconds;
    }
  }
}
