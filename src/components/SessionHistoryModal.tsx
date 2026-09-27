import React, { useState, useEffect } from 'react';
import type { StoredSessionRecord } from '../types/runner';
import { getStoredSessions, deleteStoredSession, compareSessions, type SessionComparisonResult } from '../utils/sessionStorage';
import { exportEvaluationPDF } from '../utils/pdfGenerator';
import {
  History,
  X,
  Trash2,
  FileDown,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  Award
} from 'lucide-react';

interface SessionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession?: (session: StoredSessionRecord) => void;
}

export const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({
  isOpen,
  onClose,
  onLoadSession,
}) => {
  const [sessions, setSessions] = useState<StoredSessionRecord[]>([]);
  const [selectedBeforeId, setSelectedBeforeId] = useState<string>('');
  const [selectedAfterId, setSelectedAfterId] = useState<string>('');
  const [comparison, setComparison] = useState<SessionComparisonResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredSessions();
      setSessions(stored);
      if (stored.length >= 2) {
        setSelectedBeforeId(stored[stored.length - 1].id);
        setSelectedAfterId(stored[0].id);
      } else if (stored.length === 1) {
        setSelectedBeforeId(stored[0].id);
        setSelectedAfterId(stored[0].id);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedBeforeId && selectedAfterId) {
      const b = sessions.find((s) => s.id === selectedBeforeId);
      const a = sessions.find((s) => s.id === selectedAfterId);
      if (b && a) {
        setComparison(compareSessions(b, a));
      } else {
        setComparison(null);
      }
    }
  }, [selectedBeforeId, selectedAfterId, sessions]);

  const handleDelete = (id: string) => {
    const updated = deleteStoredSession(id);
    setSessions(updated);
    if (selectedBeforeId === id || selectedAfterId === id) {
      setComparison(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Patient Evaluation History & Progress Tracker
              </h2>
              <p className="text-xs text-slate-400">
                Track longitudinal gait recovery and compare before-and-after biomechanical deltas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-slate-300 font-bold text-sm">No Saved Evaluations Yet</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Complete a 60-second runner form or vertical jump evaluation to automatically store sessions and compare before/after progress.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session Selector for Side-by-Side Comparison */}
            {sessions.length >= 2 && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  Select 2 Sessions for Longitudinal Comparison
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Baseline Session (Before):</label>
                    <select
                      value={selectedBeforeId}
                      onChange={(e) => setSelectedBeforeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.savedAt).toLocaleDateString()} — {s.profileName} (Score: {s.summary.overallFormScore}/100)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Follow-up Session (After):</label>
                    <select
                      value={selectedAfterId}
                      onChange={(e) => setSelectedAfterId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.savedAt).toLocaleDateString()} — {s.profileName} (Score: {s.summary.overallFormScore}/100)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Comparison Card */}
                {comparison && selectedBeforeId !== selectedAfterId && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-bold text-white">
                          Biomechanical Improvement Delta
                        </span>
                      </div>

                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        comparison.scoreDelta >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {comparison.scoreDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {comparison.scoreDelta >= 0 ? `+${comparison.scoreDelta} Form Points` : `${comparison.scoreDelta} Form Points`}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                      {comparison.metrics.map((m, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                          <span className="text-[10px] text-slate-400 block mb-0.5">{m.label}</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-white text-sm">{m.after}</span>
                            <span className="text-[10px] text-slate-500">{m.unit}</span>
                          </div>
                          <div className={`text-[10px] font-medium mt-1 flex items-center gap-1 ${
                            m.improved ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {m.improved ? <CheckCircle2 className="w-2.5 h-2.5" /> : <ArrowRight className="w-2.5 h-2.5" />}
                            <span>{m.statusText}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* List of Stored Sessions */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Recorded Sessions Archive ({sessions.length})
              </span>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{s.profileName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-900 uppercase">
                          {s.summary.testType === 'vertical_jump' ? 'Jump Test' : `${s.summary.profile.mode} gait`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{new Date(s.savedAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>Score: <strong className="text-cyan-300">{s.summary.overallFormScore}/100</strong></span>
                        <span>•</span>
                        <span>Cadence: {s.summary.avgCadenceSpm} SPM</span>
                        <span>•</span>
                        <span>Shin: {s.summary.avgShinAngleDeg ?? 6.5}°</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportEvaluationPDF(s.summary)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Export PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>

                      {onLoadSession && (
                        <button
                          onClick={() => {
                            onLoadSession(s);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition"
                        >
                          View Report
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
