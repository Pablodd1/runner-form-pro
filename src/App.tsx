import React, { useState, useCallback, useRef } from 'react';
import type {
  PatientProfile,
  BiomechanicsFrameMetrics,
  VerticalJumpMetrics,
  DiscrepancyAlert,
  EvaluationSummary,
  Landmark3D,
  AssessmentTestType,
} from './types/runner';
import { Navbar } from './components/Navbar';
import { IntakeModal } from './components/IntakeModal';
import { CameraVisionEngine } from './components/CameraVisionEngine';
import { TelemetryHUD } from './components/TelemetryHUD';
import { JumpPowerHUD } from './components/JumpPowerHUD';
import { AIDiscrepancyFeed } from './components/AIDiscrepancyFeed';
import { SymmetryRadar } from './components/SymmetryRadar';
import { EvaluationCountdown } from './components/EvaluationCountdown';
import { SummaryReportModal } from './components/SummaryReportModal';
import { evaluateRealTimeAlerts, generateEvaluationReport } from './utils/aiAdvisor';
import { Activity, SlidersHorizontal, Zap, Footprints } from 'lucide-react';

const DEFAULT_PROFILE: PatientProfile = {
  name: 'Marcus Vance',
  phone: '+1 (555) 876-5432',
  heightCm: 178,
  weightKg: 72,
  cameraDistanceM: 2.5,
  mode: 'treadmill',
  targetSpeedKmh: 11.0,
  runningProtocol: 'variable_intervals',
  notes: 'Baseline running form evaluation: bilateral knee flexion, mechanical power, and vertical jump profiling.',
};

export const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'intake' | 'setup' | 'live' | 'summary'>('intake');
  const [currentTestType, setCurrentTestType] = useState<AssessmentTestType>('runner_form');
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [profile, setProfile] = useState<PatientProfile>(DEFAULT_PROFILE);

  // Live telemetry state
  const [currentMetrics, setCurrentMetrics] = useState<BiomechanicsFrameMetrics | null>(null);
  const [latestJumpMetrics, setLatestJumpMetrics] = useState<VerticalJumpMetrics | null>(null);
  const [alerts, setAlerts] = useState<DiscrepancyAlert[]>([]);
  const [isEvaluationActive, setIsEvaluationActive] = useState<boolean>(false);

  // History buffer for 1-minute test
  const frameHistoryRef = useRef<BiomechanicsFrameMetrics[]>([]);
  const jumpHistoryRef = useRef<VerticalJumpMetrics[]>([]);
  const allAlertsRef = useRef<DiscrepancyAlert[]>([]);
  const snapshotRef = useRef<string | undefined>(undefined);

  // Completed evaluation summary report
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);

  // Frame processing callback from CameraVisionEngine
  const handleFrameProcessed = useCallback(
    (metrics: BiomechanicsFrameMetrics, _landmarks: Landmark3D[]) => {
      setCurrentMetrics(metrics);

      // Check for real-time AI discrepancy alerts
      const newAlerts = evaluateRealTimeAlerts(metrics, allAlertsRef.current);
      if (newAlerts.length > 0) {
        newAlerts.forEach((a) => {
          allAlertsRef.current.push(a);
          setAlerts((prev) => [...prev, a]);
        });
      }

      // Record frames if test is active
      if (isEvaluationActive) {
        frameHistoryRef.current.push(metrics);
      }
    },
    [isEvaluationActive]
  );

  // Jump processing callback from CameraVisionEngine
  const handleJumpProcessed = useCallback(
    (jumpMetrics: VerticalJumpMetrics) => {
      setLatestJumpMetrics(jumpMetrics);
      if (isEvaluationActive && jumpMetrics.jumpHeightCm > 5) {
        jumpHistoryRef.current.push(jumpMetrics);
      }
    },
    [isEvaluationActive]
  );

  // Step 1: Intake completed
  const handleIntakeSubmit = (newProfile: PatientProfile) => {
    setProfile(newProfile);
    frameHistoryRef.current = [];
    jumpHistoryRef.current = [];
    allAlertsRef.current = [];
    setAlerts([]);
    setCurrentStep('live');
  };

  // Evaluation lifecycle handlers
  const handleStartEvaluation = () => {
    frameHistoryRef.current = [];
    jumpHistoryRef.current = [];
    allAlertsRef.current = [];
    setAlerts([]);
    setIsEvaluationActive(true);
  };

  const handlePauseEvaluation = () => {
    setIsEvaluationActive(false);
  };

  const handleCompleteEvaluation = () => {
    setIsEvaluationActive(false);
    // Generate final medical evaluation summary
    const finalReport = generateEvaluationReport(
      profile,
      frameHistoryRef.current,
      allAlertsRef.current,
      snapshotRef.current,
      currentTestType,
      jumpHistoryRef.current
    );
    setSummary(finalReport);
    setCurrentStep('summary');
  };

  const handleCancelEvaluation = () => {
    setIsEvaluationActive(false);
    frameHistoryRef.current = [];
    jumpHistoryRef.current = [];
    allAlertsRef.current = [];
    setAlerts([]);
  };

  const handleResetToNewTest = () => {
    setIsEvaluationActive(false);
    frameHistoryRef.current = [];
    jumpHistoryRef.current = [];
    allAlertsRef.current = [];
    setAlerts([]);
    setSummary(null);
    setCurrentStep('intake');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        currentStep={currentStep}
        unitSystem={unitSystem}
        onToggleUnit={() => setUnitSystem((u) => (u === 'metric' ? 'imperial' : 'metric'))}
        onResetToNewTest={handleResetToNewTest}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Step 1: Patient Intake Form */}
        {currentStep === 'intake' && (
          <div className="py-4">
            <IntakeModal
              initialProfile={profile}
              unitSystem={unitSystem}
              onStartEvaluation={handleIntakeSubmit}
            />
          </div>
        )}

        {/* Step 2 & 3: Live Camera & Evaluation View */}
        {(currentStep === 'setup' || currentStep === 'live') && (
          <div className="space-y-5">
            {/* Top evaluation info header & Test Type Switcher */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white text-sm">
                  Patient: <span className="text-cyan-400">{profile.name}</span>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">Phone: {profile.phone}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">
                  {profile.heightCm} cm | {profile.weightKg} kg
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-cyan-300 font-semibold uppercase">
                  {profile.mode} @ {profile.targetSpeedKmh} km/h
                </span>
              </div>

              {/* Assessment Mode Selector */}
              <div className="flex items-center gap-2">
                <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                  <button
                    onClick={() => setCurrentTestType('runner_form')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                      currentTestType === 'runner_form'
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Footprints className="w-3.5 h-3.5" />
                    Runner Form (60s)
                  </button>

                  <button
                    onClick={() => setCurrentTestType('vertical_jump')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                      currentTestType === 'vertical_jump'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Vertical Jump & Power
                  </button>
                </div>

                <button
                  onClick={() => setCurrentStep('intake')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  Edit Patient
                </button>
              </div>
            </div>

            {/* Evaluation Controller Timer */}
            <EvaluationCountdown
              isActive={isEvaluationActive}
              onStart={handleStartEvaluation}
              onPause={handlePauseEvaluation}
              onComplete={handleCompleteEvaluation}
              onCancel={handleCancelEvaluation}
            />

            {/* Main Stage: Vision Engine + Dynamic Panels */}
            {currentTestType === 'vertical_jump' ? (
              // Vertical Jump Test Layout
              <div className="flex flex-col gap-5">
                <CameraVisionEngine
                  testType="vertical_jump"
                  onFrameProcessed={handleFrameProcessed}
                  onJumpProcessed={handleJumpProcessed}
                  runnerHeightCm={profile.heightCm}
                  runnerWeightKg={profile.weightKg}
                  speedKmh={profile.targetSpeedKmh}
                  isEvaluationActive={isEvaluationActive}
                  onSnapshotReady={(dataUrl) => {
                    snapshotRef.current = dataUrl;
                  }}
                />

                <JumpPowerHUD
                  metrics={latestJumpMetrics}
                  weightKg={profile.weightKg}
                />
              </div>
            ) : (
              // Runner Form Evaluation Layout
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left/Center: Video Vision & Joint Skeleton Tracking (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                  <CameraVisionEngine
                    testType="runner_form"
                    onFrameProcessed={handleFrameProcessed}
                    runnerHeightCm={profile.heightCm}
                    runnerWeightKg={profile.weightKg}
                    speedKmh={profile.targetSpeedKmh}
                    isEvaluationActive={isEvaluationActive}
                    onSnapshotReady={(dataUrl) => {
                      snapshotRef.current = dataUrl;
                    }}
                  />

                  {/* Real-time Telemetry HUD */}
                  <TelemetryHUD
                    metrics={currentMetrics}
                    speedKmh={profile.targetSpeedKmh}
                  />
                </div>

                {/* Right: Bilateral Symmetry Radar & AI Discrepancies (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-5">
                  <div className="h-[290px]">
                    <SymmetryRadar
                      angles={
                        currentMetrics?.angles || {
                          leftKnee: 140,
                          rightKnee: 142,
                          leftHip: 40,
                          rightHip: 42,
                          leftAnkle: 92,
                          rightAnkle: 94,
                          trunkLean: 7.2,
                          pelvicTilt: 2.1,
                          leftArmSwing: 88,
                          rightArmSwing: 90,
                          leftKneeValgus: 1.2,
                          rightKneeValgus: 1.5,
                        }
                      }
                    />
                  </div>

                  <div className="flex-1 min-h-[300px]">
                    <AIDiscrepancyFeed alerts={alerts} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Final Summary Report & Printable PDF */}
        {currentStep === 'summary' && summary && (
          <div className="py-2">
            <SummaryReportModal
              summary={summary}
              onReset={handleResetToNewTest}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-500" />
          <span>RunnerForm PRO • Medical-Grade 3D Runner Kinematics & Explosive Power Engine</span>
        </div>
        <div>
          <span>ISO 13485 Biomechanical Standards • 33-Joint BlazePose ML Inference • 60 FPS</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
