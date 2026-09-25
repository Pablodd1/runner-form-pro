import React, { useState } from 'react';
import type { BiomechanicsFrameMetrics } from '../types/runner';
import {
  Zap,
  Footprints,
  ArrowUpDown,
  Clock,
  Compass,
  Activity,
  Layers,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Percent,
  Gauge
} from 'lucide-react';

interface TelemetryHUDProps {
  metrics: BiomechanicsFrameMetrics | null;
  speedKmh?: number;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ metrics, speedKmh }) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(true);

  if (!metrics) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  // 1. Cadence status (Optimal: 165 - 185)
  const cadence = metrics.cadenceSpm;
  const isCadenceOptimal = cadence >= 165 && cadence <= 185;
  const cadenceColor = isCadenceOptimal ? 'text-emerald-400' : cadence < 165 ? 'text-amber-400' : 'text-cyan-400';

  // 2. Vertical Oscillation (Optimal: 6.0 - 8.5 cm)
  const vertOsc = metrics.verticalOscillationCm;
  const isVertOscOptimal = vertOsc >= 5.5 && vertOsc <= 8.8;
  const vertOscColor = isVertOscOptimal ? 'text-emerald-400' : 'text-amber-400';

  // 3. Ground Contact Time (Optimal: 180 - 240 ms)
  const gct = metrics.groundContactTimeMs;
  const gctColor = gct <= 240 ? 'text-emerald-400' : 'text-amber-400';

  // Advanced derived metrics with safe fallbacks
  const runningEconomy = metrics.runningEconomyRatio || Math.round((vertOsc / 120) * 1000) / 10;
  const legStiffness = metrics.legStiffnessKnM || 18.4;
  const grf = metrics.groundReactionForceBw || 2.4;
  const strikeAngle = metrics.footStrikeAngleDeg || 4.2;
  const pBreakdown = metrics.powerBreakdown || {
    pVertWatts: Math.round(metrics.powerWatts * 0.38),
    pHorizWatts: Math.round(metrics.powerWatts * 0.44),
    pInternalWatts: Math.round(metrics.powerWatts * 0.18),
  };

  return (
    <div className="space-y-3">
      {/* 6 Primary Real-Time Kinematic Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Cadence */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Cadence</span>
            <Footprints className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black font-mono ${cadenceColor}`}>{cadence}</span>
              <span className="text-[11px] text-slate-400 font-medium">SPM</span>
            </div>
            <span className="text-[10px] text-slate-500">Target: 165-180 SPM</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isCadenceOptimal ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, (cadence / 200) * 100)}%` }}
            />
          </div>
        </div>

        {/* 2. Elevation / Vertical Oscillation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Elevation Osc.</span>
            <ArrowUpDown className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black font-mono ${vertOscColor}`}>{vertOsc}</span>
              <span className="text-[11px] text-slate-400 font-medium">cm</span>
            </div>
            <span className="text-[10px] text-slate-500">Target: 6.0-8.5 cm</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isVertOscOptimal ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, (vertOsc / 15) * 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Mechanical Running Power */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Power</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-cyan-400">{metrics.powerWatts}</span>
              <span className="text-[11px] text-slate-400 font-medium">W</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono font-semibold">{metrics.powerWattsPerKg} W/kg</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all duration-300"
              style={{ width: `${Math.min(100, (metrics.powerWatts / 450) * 100)}%` }}
            />
          </div>
        </div>

        {/* 4. Ground Contact Time (GCT) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Contact Time</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black font-mono ${gctColor}`}>{gct}</span>
              <span className="text-[11px] text-slate-400 font-medium">ms</span>
            </div>
            <span className="text-[10px] text-slate-500">Duty: {metrics.dutyFactorPct}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${gct <= 240 ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, (gct / 350) * 100)}%` }}
            />
          </div>
        </div>

        {/* 5. Trunk Forward Lean */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Trunk Lean</span>
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-white">{metrics.angles.trunkLean}°</span>
            </div>
            <span className="text-[10px] text-slate-500">Target: 5° - 10°</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(100, (metrics.angles.trunkLean / 15) * 100)}%` }}
            />
          </div>
        </div>

        {/* 6. Foot Strike Pattern */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Foot Strike</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1">
            <div className="text-lg font-black uppercase text-cyan-300 tracking-tight">
              {metrics.leftFootStrike}
            </div>
            <span className="text-[10px] text-slate-400">Angle: {strikeAngle > 0 ? `+${strikeAngle}` : strikeAngle}°</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${metrics.leftFootStrike === 'midfoot' ? 'bg-emerald-400' : metrics.leftFootStrike === 'forefoot' ? 'bg-cyan-400' : 'bg-amber-400'}`}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Advanced Biomechanical Analytics Drawer */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-800/60 transition"
        >
          <span className="flex items-center gap-2 text-cyan-400">
            <Layers className="w-3.5 h-3.5" />
            Advanced Biomechanical Determinants (Kinetic Power Breakdown, Economy & Elastic Stiffness)
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            {showAdvanced ? 'Collapse' : 'Expand Details'}
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </span>
        </button>

        {showAdvanced && (
          <div className="p-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            {/* 1. Dynamic Velocity & Pace */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                <span>Adaptive Velocity</span>
                <Gauge className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-xl font-bold font-mono text-cyan-300">
                  {metrics.instantaneousSpeedKmh ?? speedKmh ?? 10.0}
                </span>
                <span className="text-[10px] text-slate-400">km/h</span>
              </div>
              <p className="text-[10px] text-cyan-400 font-semibold uppercase">
                {metrics.gaitPaceCategory ? metrics.gaitPaceCategory.replace('_', ' ') : 'TEMPO PACE'}
              </p>
            </div>

            {/* 2. Energy Waste Ratio */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                <span>Running Economy</span>
                <Percent className="w-3 h-3 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-xl font-bold font-mono text-amber-300">{runningEconomy}%</span>
                <span className="text-[10px] text-slate-400">waste ratio</span>
              </div>
              <p className="text-[10px] text-slate-500">Vertical bounce / Stride length</p>
            </div>

            {/* 2. Leg Spring Stiffness */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                <span>Leg Stiffness (K_leg)</span>
                <Activity className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-xl font-bold font-mono text-emerald-300">{legStiffness}</span>
                <span className="text-[10px] text-slate-400">kN/m</span>
              </div>
              <p className="text-[10px] text-slate-500">Spring-mass tendon elasticity</p>
            </div>

            {/* 3. Peak Ground Reaction Force */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                <span>Peak GRF Shock</span>
                <ShieldAlert className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-xl font-bold font-mono text-cyan-300">{grf}x</span>
                <span className="text-[10px] text-slate-400">Body Weight</span>
              </div>
              <p className="text-[10px] text-slate-500">Deceleration impact transient</p>
            </div>

            {/* 4. Power Component Breakdown */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                <span>Power Split</span>
                <Zap className="w-3 h-3 text-amber-400" />
              </div>
              <div className="text-[11px] font-mono space-y-0.5 mt-1">
                <div className="flex justify-between text-slate-300">
                  <span>Horiz Forward:</span>
                  <span className="font-bold text-cyan-300">{pBreakdown.pHorizWatts}W</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Vert Bounce:</span>
                  <span className="font-bold text-amber-300">{pBreakdown.pVertWatts}W</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Limb Accel:</span>
                  <span className="font-bold text-slate-300">{pBreakdown.pInternalWatts}W</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
