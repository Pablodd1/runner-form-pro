import React from 'react';
import type { DiscrepancyAlert } from '../types/runner';
import { AlertTriangle, CheckCircle, Dumbbell } from 'lucide-react';

interface AIDiscrepancyFeedProps {
  alerts: DiscrepancyAlert[];
}

export const AIDiscrepancyFeed: React.FC<AIDiscrepancyFeedProps> = ({ alerts }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Discrepancy & Wasteful Movement Feed</h3>
            <p className="text-[11px] text-slate-400">Lower extremity asymmetries & kinetic leaks</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
          Live AI Advisor
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <CheckCircle className="w-8 h-8 text-emerald-500/60 mb-2" />
          <p className="text-xs font-semibold text-slate-400">Symmetrical Kinetic Flow</p>
          <p className="text-[11px] text-slate-500 max-w-[220px] mt-1">
            Running form is balanced with no severe lower extremity discrepancies detected.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[280px] pr-1">
          {alerts.slice(-5).reverse().map((alert) => {
            const isHigh = alert.severity === 'high';
            const isMod = alert.severity === 'moderate';

            const badgeColor = isHigh
              ? 'bg-red-950 text-red-400 border-red-800'
              : isMod
              ? 'bg-amber-950 text-amber-400 border-amber-800'
              : 'bg-blue-950 text-blue-400 border-blue-800';

            return (
              <div
                key={alert.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-xs text-slate-200">{alert.title}</span>
                  <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded border ${badgeColor}`}>
                    {alert.severity}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                  {alert.description}
                </p>

                {/* Corrective Drill Recommendation */}
                <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 flex items-start gap-2 text-[10px]">
                  <Dumbbell className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-cyan-300">Prescribed Drill: </span>
                    <span className="text-slate-300">{alert.correctiveDrill}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
