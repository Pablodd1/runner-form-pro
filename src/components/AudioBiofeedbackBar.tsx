import React, { useState, useEffect } from 'react';
import { audioFeedback } from '../utils/audioFeedback';
import { Volume2, Play, Square, Mic, Plus, Minus, Music } from 'lucide-react';

interface AudioBiofeedbackBarProps {
  targetCadenceSpm: number;
}

export const AudioBiofeedbackBar: React.FC<AudioBiofeedbackBarProps> = ({ targetCadenceSpm }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(targetCadenceSpm || 172);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

  // Sync target cadence prop when changed
  useEffect(() => {
    if (targetCadenceSpm && targetCadenceSpm >= 120 && targetCadenceSpm <= 220) {
      setBpm(targetCadenceSpm);
      if (isPlaying) {
        audioFeedback.setBpm(targetCadenceSpm);
      }
    }
  }, [targetCadenceSpm, isPlaying]);

  const toggleMetronome = () => {
    if (isPlaying) {
      audioFeedback.stopMetronome();
      setIsPlaying(false);
    } else {
      audioFeedback.startMetronome(bpm);
      setIsPlaying(true);
    }
  };

  const handleBpmChange = (delta: number) => {
    const nextBpm = Math.max(130, Math.min(215, bpm + delta));
    setBpm(nextBpm);
    if (isPlaying) {
      audioFeedback.setBpm(nextBpm);
    }
  };

  const handleTestChime = () => {
    audioFeedback.playChime('success');
    if (voiceEnabled) {
      setTimeout(() => {
        audioFeedback.speakCue('Target cadence 172');
      }, 350);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
          isPlaying ? 'bg-cyan-500 text-slate-950 animate-pulse' : 'bg-slate-800 text-slate-400'
        }`}>
          <Music className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-white block">Auditory Metronome & Audio Biofeedback</span>
          <span className="text-[10px] text-slate-400">Auditory cadence synchronization for treadmill runners</span>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2.5">
        {/* Metronome Cadence BPM Control */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
          <button
            onClick={() => handleBpmChange(-2)}
            className="p-1 rounded text-slate-400 hover:text-white transition"
            title="-2 BPM"
          >
            <Minus className="w-3 h-3" />
          </button>

          <span className="font-mono font-bold text-cyan-300 text-xs px-1">
            {bpm} <span className="text-[10px] text-slate-500 font-normal">BPM</span>
          </span>

          <button
            onClick={() => handleBpmChange(2)}
            className="p-1 rounded text-slate-400 hover:text-white transition"
            title="+2 BPM"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Start / Stop Button */}
        <button
          onClick={toggleMetronome}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition shadow-sm ${
            isPlaying
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
          }`}
        >
          {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlaying ? 'Mute Metronome' : 'Start Metronome'}</span>
        </button>

        {/* Spoken Voice Cues Toggle */}
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`p-1.5 rounded-xl border transition ${
            voiceEnabled
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}
          title={voiceEnabled ? 'Spoken Biofeedback Cues Enabled' : 'Spoken Cues Disabled'}
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Test Audio Button */}
        <button
          onClick={handleTestChime}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          title="Test Audio Chime"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
