import React from 'react';
import type { JointAngles } from '../types/runner';
import { Scale, ChevronRight } from 'lucide-react';

interface SymmetryRadarProps {
  angles: JointAngles;
}

export const SymmetryRadar: React.FC<SymmetryRadarProps> = ({ angles }) => {
  const kneeDelta = Math.abs(angles.leftKnee - angles.rightKnee);
  const hipDelta = Math.abs(angles.leftHip - angles.rightHip);
  const armDelta = Math.abs(angles.leftArmSwing - angles.rightArmSwing);

  // Overall Bilateral Symmetry Index (100% is perfect symmetry)
  const symmetryIndex = Math.max(60, Math.min(100, Math.round(100 - (kneeDelta * 1.2 + hipDelta * 0.8))));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Bilateral Kinematic Symmetry</h3>
            <p className="text-[11px] text-slate-400">Left vs. Right Joint Angles</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-lg font-black font-mono text-cyan-400">{symmetryIndex}%</span>
          <span className="block text-[9px] text-slate-400">Symmetry Score</span>
        </div>
      </div>

      {/* Joint Comparison Bars */}
      <div className="space-y-3.5 my-3">
        {/* 1. Knee Flexion */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-300">Knee Flexion (L / R)</span>
            <span className={`font-mono text-[11px] ${kneeDelta > 12 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
              Δ {kneeDelta}°
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex justify-between">
              <span className="text-cyan-400 font-bold">L: {angles.leftKnee}°</span>
              <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden self-center">
                <div className="bg-cyan-400 h-full" style={{ width: `${Math.min(100, (angles.leftKnee / 180) * 100)}%` }} />
              </div>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex justify-between">
              <span className="text-blue-400 font-bold">R: {angles.rightKnee}°</span>
              <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden self-center">
                <div className="bg-blue-400 h-full" style={{ width: `${Math.min(100, (angles.rightKnee / 180) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Hip Flexion */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-300">Hip Extension (L / R)</span>
            <span className={`font-mono text-[11px] ${hipDelta > 10 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
              Δ {hipDelta}°
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex justify-between">
              <span className="text-cyan-400 font-bold">L: {angles.leftHip}°</span>
              <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden self-center">
                <div className="bg-cyan-400 h-full" style={{ width: `${Math.min(100, (angles.leftHip / 90) * 100)}%` }} />
              </div>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex justify-between">
              <span className="text-blue-400 font-bold">R: {angles.rightHip}°</span>
              <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden self-center">
                <div className="bg-blue-400 h-full" style={{ width: `${Math.min(100, (angles.rightHip / 90) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Pelvic Stability / Trendelenburg Drop */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-300">Pelvic Drop (Tilt)</span>
            <span className={`font-mono text-[11px] font-bold ${angles.pelvicTilt > 4.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {angles.pelvicTilt}° {angles.pelvicTilt > 4.5 ? '(Hip Drop)' : '(Stable)'}
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full border border-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${angles.pelvicTilt > 4.5 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, (angles.pelvicTilt / 10) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Arm swing delta: {armDelta}°</span>
        <span className="text-cyan-400 flex items-center">
          Continuous tracking <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
