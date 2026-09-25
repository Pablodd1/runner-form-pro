import React from 'react';
import type { VerticalJumpMetrics } from '../types/runner';
import {
  Zap,
  ArrowUpCircle,
  Timer,
  Activity,
  Flame,
  Gauge,
  TrendingUp,
  Award
} from 'lucide-react';

interface JumpPowerHUDProps {
  metrics: VerticalJumpMetrics | null;
  weightKg: number;
}

export const JumpPowerHUD: React.FC<JumpPowerHUDProps> = ({ metrics, weightKg }) => {
  const jumpHeight = metrics?.jumpHeightCm || 0;
  const heightInches = Math.round((jumpHeight / 2.54) * 10) / 10;
  const sayersWatts = metrics?.sayersPeakPowerWatts || 0;
  const harmanWatts = metrics?.harmanPeakPowerWatts || 0;
  const wattsPerKg = metrics?.peakPowerWattsPerKg || 0;
  const flightTime = metrics?.flightTimeMs || 0;
  const takeoffVelocity = metrics?.takeoffVelocityMs || 0;
  const dipDepth = metrics?.countermovementDepthCm || 0;
  const rsi = metrics?.reactiveStrengthIndex || 0;
  const phase = metrics?.jumpPhase || 'standing';

  // Qualitative athletic power classification
  const getPowerTier = (wKg: number) => {
    if (wKg >= 60) return { label: 'ELITE / OLYMPIC EXPLOSION', color: 'text-amber-400 bg-amber-950/80 border-amber-600' };
    if (wKg >= 50) return { label: 'COLLEGIATE / PRO ATHLETE', color: 'text-cyan-400 bg-cyan-950/80 border-cyan-600' };
    if (wKg >= 40) return { label: 'ADVANCED COMPETITIVE', color: 'text-emerald-400 bg-emerald-950/80 border-emerald-600' };
    if (wKg >= 30) return { label: 'GOOD RECREATIONAL', color: 'text-blue-400 bg-blue-950/80 border-blue-600' };
    return { label: 'DEVELOPING / BASELINE', color: 'text-slate-400 bg-slate-900 border-slate-700' };
  };

  const tier = getPowerTier(wattsPerKg);

  return (
    <div className="space-y-4">
      {/* Top Banner: Real-Time Phase & Explosive Power Tier */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-400">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400">High Jump & Explosive Power Engine</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                phase === 'flight'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 animate-bounce'
                  : phase === 'eccentric_dip'
                  ? 'bg-blue-600 text-white border-blue-400'
                  : phase === 'propulsion'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                Phase: {phase.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-lg font-black text-white">Kinematic Jump Kinetics & Power Profiling</h3>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${tier.color}`}>
          <Award className="w-4 h-4" />
          {tier.label}
        </div>
      </div>

      {/* 4 Main Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Jump Height */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-800/60 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <ArrowUpCircle className="w-4 h-4" />
              Apex Jump Height
            </span>
            <span className="font-mono text-[10px] text-cyan-300">CoM & Flight</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-white tracking-tight">
              {jumpHeight.toFixed(1)}
            </span>
            <span className="text-sm font-bold text-cyan-400">cm</span>
            <span className="text-xs text-slate-400 font-mono ml-auto">({heightInches}")</span>
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Calculated via parabolic ballistic equation: <span className="text-cyan-300 font-mono">h = ⅛·g·t²</span>
          </p>
        </div>

        {/* 2. Peak Power (Sayers Equation) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/40 border border-amber-800/60 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Flame className="w-4 h-4" />
              Peak Mechanical Power
            </span>
            <span className="font-mono text-[10px] text-amber-300">Sayers Formula</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-white tracking-tight">
              {sayersWatts}
            </span>
            <span className="text-sm font-bold text-amber-400">Watts</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>Harman Equation:</span>
            <span className="font-mono font-bold text-slate-200">{harmanWatts} W</span>
          </div>
        </div>

        {/* 3. Specific Power (W/kg) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              Power-to-Weight
            </span>
            <span className="font-mono text-[10px] text-emerald-300">{weightKg} kg</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-white tracking-tight">
              {wattsPerKg.toFixed(1)}
            </span>
            <span className="text-sm font-bold text-emerald-400">W/kg</span>
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Normalized explosive force generation per unit body mass
          </p>
        </div>

        {/* 4. Flight Time & Takeoff Velocity */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-blue-800/60 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span className="flex items-center gap-1.5 text-blue-400">
              <Timer className="w-4 h-4" />
              Flight & Takeoff
            </span>
            <span className="font-mono text-[10px] text-blue-300">Kinematics</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-white tracking-tight">
              {flightTime}
            </span>
            <span className="text-sm font-bold text-blue-400">ms</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>Takeoff Velocity:</span>
            <span className="font-mono font-bold text-slate-200">{takeoffVelocity.toFixed(2)} m/s</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar: Dip Depth, RSI, Dynamic Force */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-semibold">Squat Dip Depth:</span>
          </div>
          <span className="font-mono font-bold text-white text-sm">{dipDepth.toFixed(1)} cm</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-semibold">Reactive Strength Index (RSI):</span>
          </div>
          <span className="font-mono font-bold text-emerald-400 text-sm">{rsi > 0 ? rsi.toFixed(2) : '--'}</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 font-semibold">Gold Standard Method:</span>
          </div>
          <span className="font-mono text-slate-400 text-xs">Sayers / Harman equations</span>
        </div>
      </div>
    </div>
  );
};
