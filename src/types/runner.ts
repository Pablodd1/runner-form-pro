export type EvaluationMode = 'treadmill' | 'street' | 'track';

export type AssessmentTestType = 'runner_form' | 'vertical_jump';

export type FootStrikeType = 'heel' | 'midfoot' | 'forefoot';

export type RunningSpeedProtocol = 'variable_intervals' | 'steady_tempo' | 'sprint_ramp';

export interface PatientProfile {
  name: string;
  phone: string;
  heightCm: number;
  weightKg: number;
  cameraDistanceM: number;
  mode: EvaluationMode;
  targetSpeedKmh: number;
  runningProtocol?: RunningSpeedProtocol;
  notes?: string;
}

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface JointAngles {
  leftKnee: number;       // degrees
  rightKnee: number;
  leftHip: number;
  rightHip: number;
  leftAnkle: number;
  rightAnkle: number;
  trunkLean: number;      // forward tilt from vertical
  pelvicTilt: number;     // lateral pelvic drop (Trendelenburg)
  leftArmSwing: number;
  rightArmSwing: number;
  leftKneeValgus: number; // frontal plane inward collapse
  rightKneeValgus: number;
}

export interface PowerBreakdown {
  pVertWatts: number;
  pHorizWatts: number;
  pInternalWatts: number;
}

export interface BiomechanicsFrameMetrics {
  timestamp: number;
  cadenceSpm: number;
  verticalOscillationCm: number;
  powerWatts: number;
  powerWattsPerKg: number;
  powerBreakdown: PowerBreakdown;
  groundContactTimeMs: number;
  dutyFactorPct: number;
  strideLengthM: number;
  runningEconomyRatio: number; // (vertOsc / strideLength) * 100 - % energy wasted bouncing
  legStiffnessKnM: number;     // Leg spring stiffness K_leg in kN/m
  groundReactionForceBw: number; // Peak GRF in multiples of Body Weight (e.g. 2.5x BW)
  footStrikeAngleDeg: number;  // Foot strike angle relative to ground
  leftFootStrike: FootStrikeType;
  rightFootStrike: FootStrikeType;
  overstrideDistanceCm: number; // distance foot lands ahead of center of mass
  instantaneousSpeedKmh?: number; // Real-time estimated speed
  gaitPaceCategory?: 'recovery' | 'aerobic_jog' | 'tempo' | 'fast_run' | 'sprint';
  angles: JointAngles;
}

export interface VerticalJumpMetrics {
  timestamp: number;
  jumpPhase: 'standing' | 'eccentric_dip' | 'propulsion' | 'flight' | 'landing';
  jumpHeightCm: number;
  flightTimeMs: number;
  takeoffVelocityMs: number;
  sayersPeakPowerWatts: number;
  harmanPeakPowerWatts: number;
  peakPowerWattsPerKg: number;
  countermovementDepthCm: number;
  reactiveStrengthIndex: number; // RSI = Flight Time (s) / Contact Time (s)
  currentCoMY: number;
  baselineCoMY: number;
}

export interface DiscrepancyAlert {
  id: string;
  type: 'asymmetry' | 'overstride' | 'vertical_bounce' | 'arm_crossover' | 'pelvic_drop' | 'cadence_low' | 'excessive_lean' | 'knee_valgus' | 'energy_leak';
  severity: 'low' | 'moderate' | 'high';
  title: string;
  description: string;
  correctiveDrill: string;
  timestamp: number;
}

export interface EvaluationSummary {
  profile: PatientProfile;
  testType: AssessmentTestType;
  durationSeconds: number;
  overallFormScore: number; // 0 - 100
  avgCadenceSpm: number;
  avgVerticalOscillationCm: number;
  avgPowerWatts: number;
  avgPowerWattsPerKg: number;
  avgGroundContactTimeMs: number;
  avgStrideLengthM: number;
  avgRunningEconomyRatio: number;
  avgLegStiffnessKnM: number;
  avgGroundReactionForceBw: number;
  avgTrunkLeanDeg: number;
  bilateralSymmetryPct: number; // 0 - 100%
  leftKneeAvgFlexion: number;
  rightKneeAvgFlexion: number;
  kneeAsymmetryDelta: number;
  leftHipAvgFlexion: number;
  rightHipAvgFlexion: number;
  predominantStrike: FootStrikeType;
  avgFootStrikeAngleDeg: number;
  peakSpeedKmh?: number;
  minSpeedKmh?: number;
  speedPaceBreakdown?: {
    recoverySeconds: number;
    jogSeconds: number;
    tempoSeconds: number;
    sprintSeconds: number;
  };
  // Jump specific results if testType === 'vertical_jump'
  jumpSummary?: {
    bestJumpHeightCm: number;
    avgJumpHeightCm: number;
    bestSayersPowerWatts: number;
    bestHarmanPowerWatts: number;
    bestPowerWattsPerKg: number;
    bestFlightTimeMs: number;
    takeoffVelocityMs: number;
    reactiveStrengthIndex: number;
    totalJumpsRecorded: number;
  };
  alertsDetected: DiscrepancyAlert[];
  prescribedDrills: {
    title: string;
    focus: string;
    instructions: string;
    frequency: string;
  }[];
  snapshotDataUrl?: string;
}
