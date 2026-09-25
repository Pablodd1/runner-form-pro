import React from 'react';
import { Activity, Camera, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentStep: 'intake' | 'setup' | 'live' | 'summary';
  unitSystem: 'metric' | 'imperial';
  onToggleUnit: () => void;
  onResetToNewTest: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStep,
  unitSystem,
  onToggleUnit,
  onResetToNewTest,
}) => {
  return (
    <header className="w-full bg-slate-900/95 border-b border-cyan-500/20 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand & Medical Grade Badge */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={onResetToNewTest}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
            <Activity className="w-6 h-6 animate-pulse" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                RunnerForm <span className="text-cyan-400">PRO</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                Medical Biomechanics
              </span>
            </div>
            <p className="text-[11px] text-slate-400">33-Joint 3D Blue Kinematics & Kinetic Diagnostics</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/80 px-4 py-1.5 rounded-full border border-slate-800 text-xs">
          <div className={`flex items-center gap-1.5 font-medium ${currentStep === 'intake' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === 'intake' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>1</span>
            Intake
          </div>
          <span className="text-slate-600">→</span>
          <div className={`flex items-center gap-1.5 font-medium ${currentStep === 'setup' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
            <Camera className="w-3.5 h-3.5" />
            Camera & Video
          </div>
          <span className="text-slate-600">→</span>
          <div className={`flex items-center gap-1.5 font-medium ${currentStep === 'live' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
            <span className={`w-2 h-2 rounded-full ${currentStep === 'live' ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`} />
            1-Min Evaluation
          </div>
          <span className="text-slate-600">→</span>
          <div className={`flex items-center gap-1.5 font-medium ${currentStep === 'summary' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
            <FileText className="w-3.5 h-3.5" />
            Clinical PDF
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Unit Toggle */}
          <button
            onClick={onToggleUnit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Toggle between Metric (km/h, cm, kg) and Imperial (mph, in, lbs)"
          >
            <span>Unit:</span>
            <span className="text-cyan-400 uppercase">{unitSystem}</span>
          </button>

          {/* New Patient Button */}
          <button
            onClick={onResetToNewTest}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20 transition active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            New Evaluation
          </button>
        </div>
      </div>
    </header>
  );
};
