import type { EvaluationSummary, StoredSessionRecord } from '../types/runner';

const STORAGE_KEY = 'runnerform_pro_session_records_v1';

export function saveEvaluationSession(summary: EvaluationSummary): StoredSessionRecord {
  const records = getStoredSessions();
  const record: StoredSessionRecord = {
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    savedAt: Date.now(),
    profileName: summary.profile.name || 'Anonymous Runner',
    summary,
  };

  // Keep last 30 sessions in storage
  const updated = [record, ...records].slice(0, 30);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage full or unavailable:', err);
  }
  return record;
}

export function getStoredSessions(): StoredSessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredSessionRecord[];
  } catch (err) {
    console.warn('Error reading stored sessions:', err);
    return [];
  }
}

export function deleteStoredSession(id: string): StoredSessionRecord[] {
  const records = getStoredSessions().filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Error deleting stored session:', err);
  }
  return records;
}

export interface MetricComparisonDelta {
  label: string;
  unit: string;
  before: number;
  after: number;
  delta: number;
  improved: boolean;
  statusText: string;
}

export interface SessionComparisonResult {
  sessionBefore: StoredSessionRecord;
  sessionAfter: StoredSessionRecord;
  scoreDelta: number;
  symmetryDelta: number;
  cadenceDelta: number;
  shinAngleDelta: number;
  vertOscDelta: number;
  metrics: MetricComparisonDelta[];
}

export function compareSessions(
  before: StoredSessionRecord,
  after: StoredSessionRecord
): SessionComparisonResult {
  const a = before.summary;
  const b = after.summary;

  const scoreDelta = b.overallFormScore - a.overallFormScore;
  const symmetryDelta = b.bilateralSymmetryPct - a.bilateralSymmetryPct;
  const cadenceDelta = b.avgCadenceSpm - a.avgCadenceSpm;
  const shinAngleDelta = Math.round(((b.avgShinAngleDeg ?? 6.5) - (a.avgShinAngleDeg ?? 6.5)) * 10) / 10;
  const vertOscDelta = Math.round((b.avgVerticalOscillationCm - a.avgVerticalOscillationCm) * 10) / 10;

  const metrics: MetricComparisonDelta[] = [
    {
      label: 'Overall Form Score',
      unit: '/100',
      before: a.overallFormScore,
      after: b.overallFormScore,
      delta: scoreDelta,
      improved: scoreDelta > 0,
      statusText: scoreDelta > 0 ? `+${scoreDelta} pts improvement` : `${scoreDelta} pts`,
    },
    {
      label: 'Bilateral Symmetry',
      unit: '%',
      before: a.bilateralSymmetryPct,
      after: b.bilateralSymmetryPct,
      delta: symmetryDelta,
      improved: symmetryDelta >= 0,
      statusText: symmetryDelta >= 0 ? `+${symmetryDelta}% more balanced` : `${symmetryDelta}%`,
    },
    {
      label: 'Touchdown Shin Angle',
      unit: '°',
      before: a.avgShinAngleDeg ?? 6.5,
      after: b.avgShinAngleDeg ?? 6.5,
      delta: shinAngleDelta,
      improved: shinAngleDelta <= 0,
      statusText: shinAngleDelta <= 0 ? `${Math.abs(shinAngleDelta)}° closer to vertical` : `+${shinAngleDelta}° forward reaching`,
    },
    {
      label: 'Average Cadence',
      unit: 'SPM',
      before: a.avgCadenceSpm,
      after: b.avgCadenceSpm,
      delta: cadenceDelta,
      improved: cadenceDelta >= 0,
      statusText: cadenceDelta >= 0 ? `+${cadenceDelta} SPM higher frequency` : `${cadenceDelta} SPM`,
    },
    {
      label: 'Vertical Oscillation',
      unit: 'cm',
      before: a.avgVerticalOscillationCm,
      after: b.avgVerticalOscillationCm,
      delta: vertOscDelta,
      improved: vertOscDelta <= 0,
      statusText: vertOscDelta <= 0 ? `${Math.abs(vertOscDelta)}cm reduced bounce` : `+${vertOscDelta}cm higher bounce`,
    },
  ];

  return {
    sessionBefore: before,
    sessionAfter: after,
    scoreDelta,
    symmetryDelta,
    cadenceDelta,
    shinAngleDelta,
    vertOscDelta,
    metrics,
  };
}
