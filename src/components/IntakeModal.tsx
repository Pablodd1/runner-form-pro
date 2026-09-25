import React, { useState } from 'react';
import type { PatientProfile, EvaluationMode, RunningSpeedProtocol } from '../types/runner';
import { User, Phone, Ruler, Scale, Gauge, Compass, Play, Sparkles, Camera, Zap } from 'lucide-react';

interface IntakeModalProps {
  initialProfile: PatientProfile;
  unitSystem: 'metric' | 'imperial';
  onStartEvaluation: (profile: PatientProfile) => void;
}

export const IntakeModal: React.FC<IntakeModalProps> = ({
  initialProfile,
  unitSystem,
  onStartEvaluation,
}) => {
  const [profile, setProfile] = useState<PatientProfile>(initialProfile);

  // Conversion helpers
  const heightDisplay = unitSystem === 'metric' ? profile.heightCm : Math.round(profile.heightCm / 2.54);
  const weightDisplay = unitSystem === 'metric' ? profile.weightKg : Math.round(profile.weightKg * 2.20462);
  const speedDisplay = unitSystem === 'metric' ? profile.targetSpeedKmh : Math.round((profile.targetSpeedKmh / 1.60934) * 10) / 10;
  const distanceDisplay = unitSystem === 'metric' ? profile.cameraDistanceM : Math.round(profile.cameraDistanceM * 3.28084 * 10) / 10;

  const handleHeightChange = (val: number) => {
    const cm = unitSystem === 'metric' ? val : Math.round(val * 2.54);
    setProfile((prev) => ({ ...prev, heightCm: cm }));
  };

  const handleWeightChange = (val: number) => {
    const kg = unitSystem === 'metric' ? val : Math.round(val / 2.20462);
    setProfile((prev) => ({ ...prev, weightKg: kg }));
  };

  const handleSpeedChange = (val: number) => {
    const kmh = unitSystem === 'metric' ? val : Math.round(val * 1.60934 * 10) / 10;
    setProfile((prev) => ({ ...prev, targetSpeedKmh: kmh }));
  };

  const handleDistanceChange = (val: number) => {
    const meters = unitSystem === 'metric' ? val : Math.round((val / 3.28084) * 10) / 10;
    setProfile((prev) => ({ ...prev, cameraDistanceM: meters }));
  };

  const autofillPatient = (type: 'treadmill' | 'street') => {
    if (type === 'treadmill') {
      setProfile({
        name: 'Sarah Connor',
        phone: '+1 (555) 234-5678',
        heightCm: 172,
        weightKg: 63,
        cameraDistanceM: 2.5,
        mode: 'treadmill',
        targetSpeedKmh: 11.5,
        runningProtocol: 'variable_intervals',
        notes: 'Gait evaluation for knee alignment & mid-stance symmetry at tempo pace.',
      });
    } else {
      setProfile({
        name: 'Marcus Vance',
        phone: '+1 (555) 876-5432',
        heightCm: 184,
        weightKg: 76,
        cameraDistanceM: 2.5,
        mode: 'street',
        targetSpeedKmh: 13.0,
        runningProtocol: 'variable_intervals',
        notes: 'Overground sprint & cadence efficiency study.',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      alert('Please enter Patient Name.');
      return;
    }
    onStartEvaluation(profile);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Decorative top cyan bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-800/80">
            Step 1 • Patient & Test Intake
          </span>
          <h2 className="text-2xl font-extrabold text-white mt-2">Clinical Runner Intake</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Enter patient details to calibrate physical dimensions, scaling, power physics, and cadence thresholds.
          </p>
        </div>

        {/* Quick Demo Fill Buttons */}
        <div className="flex sm:flex-col gap-2">
          <button
            type="button"
            onClick={() => autofillPatient('treadmill')}
            className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Auto-fill Treadmill
          </button>
          <button
            type="button"
            onClick={() => autofillPatient('street')}
            className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Auto-fill Street
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name and Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Patient Name *
            </label>
            <input
              type="text"
              required
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              Patient Phone *
            </label>
            <input
              type="tel"
              required
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="e.g. +1 (555) 019-2834"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>
        </div>

        {/* Height, Weight, Speed, Camera Distance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-cyan-400" />
              Height ({unitSystem === 'metric' ? 'cm' : 'in'})
            </label>
            <input
              type="number"
              min="100"
              max="240"
              required
              value={heightDisplay}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Calibrates anatomical scaling</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              Weight ({unitSystem === 'metric' ? 'kg' : 'lbs'})
            </label>
            <input
              type="number"
              min="30"
              max="200"
              required
              value={weightDisplay}
              onChange={(e) => handleWeightChange(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Calculates mechanical power</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Baseline Speed ({unitSystem === 'metric' ? 'km/h' : 'mph'})
            </label>
            <input
              type="number"
              step="0.5"
              min="3"
              max="35"
              required
              value={speedDisplay}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Target or starting pace</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              Camera Distance ({unitSystem === 'metric' ? 'm' : 'ft'})
            </label>
            <input
              type="number"
              step="0.1"
              min="1.5"
              max="6.0"
              required
              value={distanceDisplay}
              onChange={(e) => handleDistanceChange(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
            <span className="text-[10px] text-cyan-400/90 mt-1 block">Optimal: 2.5m (8 ft)</span>
          </div>
        </div>

        {/* Running Pace Protocol: Variable vs Steady vs Sprint */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Running Speed Protocol (1-Minute Dynamic Tracking)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'variable_intervals',
                label: 'Variable Pace / Intervals',
                badge: 'Recommended',
                desc: 'Runner alternates slow jog, tempo & all-out sprint. Dynamic AI adapts cadence and power in real-time.',
              },
              {
                id: 'steady_tempo',
                label: 'Steady State Pace',
                badge: 'Fixed Speed',
                desc: 'Constant speed on treadmill belt or track lane. Focuses on stride fatigue and symmetry breakdown.',
              },
              {
                id: 'sprint_ramp',
                label: 'Sprint Acceleration Ramp',
                badge: 'Max Velocity',
                desc: 'Progressive speed build from warm-up jog up to max sprint velocity and knee drive profiling.',
              },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProfile({ ...profile, runningProtocol: p.id as RunningSpeedProtocol })}
                className={`text-left p-3 rounded-xl border transition ${
                  (profile.runningProtocol || 'variable_intervals') === p.id
                    ? 'border-cyan-500 bg-cyan-950/40 text-white shadow-md shadow-cyan-950'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-cyan-300">{p.label}</div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                    {p.badge}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Evaluation Mode Selection: Treadmill vs Street vs Track */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Evaluation Environment Mode
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'treadmill', label: 'Treadmill', desc: 'Constant belt speed, side or oblique view' },
              { id: 'street', label: 'Street / Road', desc: 'Overground outdoor asphalt running' },
              { id: 'track', label: 'Athletic Track', desc: 'Sprint / middle distance lane track' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setProfile({ ...profile, mode: m.id as EvaluationMode })}
                className={`text-left p-3 rounded-xl border transition ${
                  profile.mode === m.id
                    ? 'border-cyan-500 bg-cyan-950/40 text-white shadow-md shadow-cyan-950'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-sm text-cyan-300">{m.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Clinical Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
            Clinical Symptoms / Assessment Focus (Optional)
          </label>
          <textarea
            rows={2}
            value={profile.notes || ''}
            onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
            placeholder="e.g. Asymmetrical knee flexion, right foot strike pain, suspected overstride at speeds > 10 km/h..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-base shadow-xl shadow-cyan-500/25 transition active:scale-[0.99] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            Initiate 60-Second Running Gait Protocol
          </button>
          <div className="text-center text-[11px] text-slate-400 mt-2">
            Auto-calibrated for camera distance ({profile.cameraDistanceM}m), height ({profile.heightCm}cm), weight ({profile.weightKg}kg), and dynamic speed transitions.
          </div>
        </div>
      </form>
    </div>
  );
};
