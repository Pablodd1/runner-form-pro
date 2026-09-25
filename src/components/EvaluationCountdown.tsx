import React, { useEffect, useState, useRef } from 'react';
import { audioCues } from '../utils/audioCues';
import confetti from 'canvas-confetti';
import { Play, Pause, Square, Timer, CheckCircle } from 'lucide-react';

interface EvaluationCountdownProps {
  isActive: boolean;
  onStart: () => void;
  onPause: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

export const EvaluationCountdown: React.FC<EvaluationCountdownProps> = ({
  isActive,
  onStart,
  onPause,
  onComplete,
  onCancel,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Preparation 3-2-1 countdown before 60-second test
  const handleInitiate = () => {
    setPrepCountdown(3);
    audioCues.playCountdownBeep(440);

    const prepInterval = window.setInterval(() => {
      setPrepCountdown((prev) => {
        if (prev === null || prev <= 1) {
          window.clearInterval(prepInterval);
          audioCues.playStartChime();
          window.setTimeout(() => onStart(), 0);
          return null;
        }
        audioCues.playCountdownBeep(440 + (4 - prev) * 50);
        return prev - 1;
      });
    }, 1000);
  };

  // 60-second evaluation test loop
  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          // Halfway 30s audio cue
          if (prev === 31) {
            audioCues.playCountdownBeep(660);
          }
          // 10s audio warning
          if (prev <= 4 && prev > 1) {
            audioCues.playCountdownBeep(520);
          }

          if (prev <= 1) {
            if (timerRef.current) window.clearInterval(timerRef.current);
            audioCues.playCompleteChime();
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#00E5FF', '#0070F3', '#10B981', '#F59E0B'],
            });
            window.setTimeout(() => onComplete(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isActive, onComplete]);

  const elapsed = 60 - secondsRemaining;
  const progressPct = (elapsed / 60) * 100;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Timer Display */}
      <div className="flex items-center gap-4">
        {/* Radial Progress Gauge */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#1e293b"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#00E5FF"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={175.9}
              strokeDashoffset={175.9 - (175.9 * progressPct) / 100}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-extrabold font-mono text-white leading-none">
              {secondsRemaining}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Sec</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-cyan-400" />
            <h3 className="font-extrabold text-white text-base">
              1-Minute Biomechanical Evaluation
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {isActive
              ? `Recording live stride kinematics (${elapsed}s / 60s continuous)`
              : secondsRemaining === 0
              ? 'Evaluation complete! Ready for clinical PDF report.'
              : 'Continuous runner gait assessment at steady treadmill or street velocity.'}
          </p>
        </div>
      </div>

      {/* Countdown modal if in 3-2-1 prep */}
      {prepCountdown !== null && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="text-center p-8 bg-slate-900 border border-cyan-500/40 rounded-3xl shadow-2xl">
            <div className="text-7xl font-black font-mono text-cyan-400 animate-bounce">
              {prepCountdown}
            </div>
            <p className="text-slate-300 font-bold text-lg mt-3">Get Ready to Run...</p>
            <span className="text-xs text-slate-500">Maintain steady stride and alignment</span>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {!isActive && secondsRemaining > 0 && (
          <button
            onClick={handleInitiate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/30 transition active:scale-95"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Start 1-Min Test
          </button>
        )}

        {isActive && (
          <>
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
            <button
              onClick={onComplete}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              <CheckCircle className="w-4 h-4" />
              Finish Early
            </button>
          </>
        )}

        {secondsRemaining < 60 && !isActive && secondsRemaining > 0 && (
          <button
            onClick={onCancel}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700"
            title="Reset timer"
          >
            <Square className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
