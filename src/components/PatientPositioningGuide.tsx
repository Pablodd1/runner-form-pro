import { useEffect } from 'react';
import type { FC } from 'react';
import {
  Camera,
  User,
  ArrowRight,
  CheckCircle2,
  Info,
  X,
  Move,
  Eye,
  HelpCircle,
} from 'lucide-react';

export interface PatientPositioningGuideProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export interface PositioningHelpButtonProps {
  onClick: () => void;
  className?: string;
  title?: string;
}

/**
 * Small '?' help button component export to re-open the patient positioning guide.
 */
export const PositioningHelpButton: FC<PositioningHelpButtonProps> = ({
  onClick,
  className = '',
  title = 'Open Camera & Patient Positioning Guide',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/50 shadow-md transition-all active:scale-95 group text-xs font-semibold ${className}`}
    >
      <HelpCircle className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
      <span className="font-mono font-bold">?</span>
      <span className="hidden sm:inline text-[11px] text-slate-300 group-hover:text-cyan-200">
        Positioning Guide
      </span>
    </button>
  );
};

/**
 * Clinical Patient & Camera Positioning Guide overlay modal.
 * Visualizes standard biomechanical camera setup, subject framing, and sagittal/frontal angles.
 */
export const PatientPositioningGuide: FC<PatientPositioningGuideProps> = ({
  isVisible,
  onDismiss,
}) => {
  // Dismiss on Escape key
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="positioning-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onDismiss}
    >
      {/* Modal Dialog Window */}
      <div
        className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl shadow-cyan-950/40 text-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-slate-800 bg-slate-900/70">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-700/60">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>CLINICAL ACQUISITION PROTOCOL • POSE ESTIMATION SETUP</span>
            </div>
            <h2
              id="positioning-guide-title"
              className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2"
            >
              Optimal Camera & Patient Positioning
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Proper camera placement and subject framing ensure 99.4% anatomical landmark accuracy,
              eliminating parallax distortion and joint occlusion errors.
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close guide"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition active:scale-95 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-8 text-sm">
          {/* SECTION 1: Camera Placement */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-base uppercase tracking-wider">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF]">
                  <Camera className="w-4 h-4" />
                </div>
                <h3>1. Camera Placement & Distance</h3>
              </div>
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
                <Move className="w-3.5 h-3.5 text-cyan-400" />
                <span>Stationary Tripod Alignment</span>
              </div>
            </div>

            {/* Side-view CSS Diagram: Camera -> Patient */}
            <div className="relative w-full h-72 sm:h-80 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 overflow-hidden flex flex-col justify-between shadow-inner">
              {/* Diagram Header / Grid Info */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 z-10">
                <span className="flex items-center gap-1.5 text-cyan-300 font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
                  SIDE-VIEW GEOMETRY (SAGITTAL PLANE ACQUISITION)
                </span>
                <span className="hidden sm:inline text-slate-500">
                  Grid: 0.5m spacing • Optical Axis 0° Tilt
                </span>
              </div>

              {/* Diagram Background Grid */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #00E5FF 1px, transparent 1px), linear-gradient(to bottom, #00E5FF 1px, transparent 1px)',
                  backgroundSize: '36px 36px',
                }}
              />

              {/* Main Visual Arena: Camera -> Sight Cone -> Runner */}
              <div className="relative flex-1 flex items-end justify-between px-3 sm:px-8 pb-8 pt-4">
                {/* Floor Plane Line */}
                <div className="absolute bottom-8 left-3 right-3 h-1 bg-gradient-to-r from-slate-700 via-cyan-900/60 to-slate-700 rounded-full">
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Ground / Treadmill Deck Surface
                  </span>
                </div>

                {/* --- Left: Camera & Tripod Rig --- */}
                <div className="relative z-10 flex flex-col items-center">
                  {/* Height Dimension Callout */}
                  <div className="absolute -left-3 sm:-left-6 top-2 bottom-8 w-px border-l-2 border-dashed border-cyan-400/80 flex items-center justify-center">
                    <span className="absolute -left-10 sm:-left-12 rotate-[-90deg] text-[10px] font-mono font-bold text-cyan-300 bg-slate-950 px-1 rounded whitespace-nowrap">
                      90 - 100 cm
                    </span>
                  </div>

                  {/* Camera Body & Lens */}
                  <div className="relative flex items-center">
                    <div className="w-12 sm:w-14 h-8 sm:h-9 bg-slate-950 border-2 border-cyan-400 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                      <Camera className="w-4 sm:w-5 h-4 sm:h-5 text-cyan-400" />
                      {/* Recording status LED */}
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-ping" />
                    </div>
                    {/* Lens cone */}
                    <div className="w-3 sm:w-4 h-5 sm:h-6 bg-gradient-to-r from-cyan-400 to-cyan-200 rounded-r-sm shadow-md" />
                  </div>

                  {/* Tripod Mount & Legs */}
                  <div className="w-1.5 h-16 sm:h-20 bg-slate-500 mt-0.5 rounded-sm" />
                  <div className="relative w-16 sm:w-20 h-8 flex justify-between">
                    <div className="w-1 h-8 bg-slate-600 rotate-[-25deg] origin-top rounded-full" />
                    <div className="w-1 h-8 bg-slate-600 rotate-[25deg] origin-top rounded-full" />
                  </div>

                  {/* Label */}
                  <div className="text-center mt-1">
                    <span className="text-[11px] font-bold text-white block">Camera Rig</span>
                    <span className="text-[10px] text-cyan-300 font-mono">Hip Level</span>
                  </div>
                </div>

                {/* --- Center: Field of View & Distance Indicators --- */}
                <div className="relative flex-1 h-36 sm:h-44 mx-2 sm:mx-6 flex flex-col justify-center items-center">
                  {/* Optical FOV Cone */}
                  <div
                    className="absolute inset-y-0 left-0 right-0 opacity-20 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(0,229,255,0.45) 0%, rgba(0,229,255,0.15) 60%, transparent 100%)',
                      clipPath: 'polygon(0% 50%, 100% 0%, 100% 100%)',
                    }}
                  />

                  {/* Centerline Optical Laser (Hip to Camera) */}
                  <div className="w-full flex items-center gap-1">
                    <div className="flex-1 border-t-2 border-dashed border-cyan-400/80 relative">
                      <span className="absolute left-1/2 -top-5 -translate-x-1/2 text-[10px] font-bold text-cyan-300 bg-slate-900/90 px-2 py-0.5 rounded border border-cyan-500/40 whitespace-nowrap shadow">
                        Horizontal Optical Axis (Hip Alignment)
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
                  </div>

                  {/* Distance Dimension Line */}
                  <div className="w-full mt-8 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between border-t border-slate-600 relative">
                      <div className="w-2 h-2 border-l border-t border-slate-400 rotate-[-45deg] -mt-1" />
                      <span className="text-[11px] font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        2.0 - 3.0 meters (6 - 10 ft)
                      </span>
                      <div className="w-2 h-2 border-r border-t border-slate-400 rotate-[45deg] -mt-1" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Optimal framing without wide-angle barrel distortion
                    </span>
                  </div>
                </div>

                {/* --- Right: Patient / Runner Figure on Treadmill --- */}
                <div className="relative z-10 flex flex-col items-center">
                  {/* Runner Silhouette in Mid-Stance Gait */}
                  <div className="relative w-16 sm:w-20 h-40 sm:h-44 flex flex-col items-center">
                    {/* Head */}
                    <div className="w-6 h-6 rounded-full border-2 border-cyan-300 bg-cyan-950 flex items-center justify-center shadow-[0_0_8px_rgba(0,229,255,0.4)]">
                      <span className="w-2 h-2 rounded-full bg-cyan-300" />
                    </div>

                    {/* Torso / Spine (slight forward lean) */}
                    <div className="w-1.5 h-12 bg-slate-200 rotate-[7deg] origin-top rounded-full my-0.5" />

                    {/* Hip / Greater Trochanter Landmark (Target alignment) */}
                    <div className="absolute top-16 -left-1 flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-[#00E5FF] border-2 border-slate-950 shadow-[0_0_10px_#00E5FF] animate-pulse" />
                      <span className="hidden sm:inline-block text-[9px] font-mono font-bold text-cyan-300 bg-slate-950/90 px-1 py-0.5 rounded border border-cyan-500/40">
                        Hip (Trochanter)
                      </span>
                    </div>

                    {/* Arms (Running swing) */}
                    <div className="absolute top-8 left-2 w-1 h-8 bg-slate-400 rotate-[-35deg] origin-top rounded-full" />
                    <div className="absolute top-8 right-2 w-1 h-8 bg-slate-400 rotate-[35deg] origin-top rounded-full" />

                    {/* Stance Leg & Knee flexion */}
                    <div className="absolute top-18 left-3 w-1.5 h-11 bg-cyan-300 rotate-[-12deg] origin-top rounded-full" />
                    <div className="absolute top-28 left-1 w-1.5 h-12 bg-cyan-300 rotate-[8deg] origin-top rounded-full" />

                    {/* Trailing Swing Leg */}
                    <div className="absolute top-18 right-2 w-1.5 h-10 bg-slate-400 rotate-[30deg] origin-top rounded-full" />
                    <div className="absolute top-26 right-6 w-1.5 h-10 bg-slate-400 rotate-[-45deg] origin-top rounded-full" />
                  </div>

                  {/* Treadmill Deck Box */}
                  <div className="w-28 sm:w-36 h-4 bg-slate-800 border border-slate-700 rounded-sm flex items-center justify-center px-1 shadow-md">
                    <span className="text-[9px] font-mono text-cyan-300 flex items-center gap-1 tracking-wider uppercase">
                      Belt Travel &gt;&gt;
                    </span>
                  </div>

                  {/* Label */}
                  <div className="text-center mt-1">
                    <span className="text-[11px] font-bold text-white block">Patient</span>
                    <span className="text-[10px] text-slate-400">Mid-Stance Center</span>
                  </div>
                </div>
              </div>

              {/* Bottom Diagram Footnote */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    <strong>Treadmill:</strong> Place camera perpendicular (90°) to belt, slightly
                    behind deck center.
                  </span>
                </span>
                <span className="text-slate-400">
                  <strong>Track / Street:</strong> Camera stationary on tripod; subject runs through
                  frame center.
                </span>
              </div>
            </div>

            {/* Camera Setup Guideline Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Move className="w-3.5 h-3.5" />
                  <span>Height & Distance Specifications</span>
                </div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  <li>
                    <strong>Hip Height (90-100 cm):</strong> Match lens height to the greater
                    trochanter to minimize perspective slant.
                  </li>
                  <li>
                    <strong>Distance (2-3 meters / 6-10 ft):</strong> Eliminates wide-angle
                    fish-eye distortion while fitting the full gait cycle.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Environment Specifics</span>
                </div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  <li>
                    <strong>Treadmill Mode:</strong> Camera strictly perpendicular to belt lateral
                    rail, positioned 10-15cm behind belt center.
                  </li>
                  <li>
                    <strong>Street / Track Mode:</strong> Rigid stationary mount; patient sprints
                    linearly through calibrated optical zone.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 2: Patient Framing */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-base uppercase tracking-wider">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF]">
                  <User className="w-4 h-4" />
                </div>
                <h3>2. Patient Framing & Environment</h3>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Full Kinematic Chain Visibility</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Left: Viewfinder Frame Diagram (5 cols) */}
              <div className="md:col-span-5">
                <div className="relative w-full h-64 bg-slate-900/90 rounded-2xl border-2 border-slate-800 p-3 overflow-hidden flex flex-col justify-between shadow-lg">
                  {/* Viewfinder HUD Corner Brackets */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#00E5FF]" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#00E5FF]" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#00E5FF]" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#00E5FF]" />

                  {/* Top 20% Margin Indicator */}
                  <div className="w-full bg-cyan-500/10 border-b border-dashed border-cyan-400/60 py-1 px-2 text-center rounded-t-lg">
                    <span className="text-[10px] font-mono font-bold text-cyan-300 flex items-center justify-center gap-1">
                      <span>↓</span>
                      <span>~20% Headroom Margin (Bounce Zone)</span>
                      <span>↓</span>
                    </span>
                  </div>

                  {/* Centered Silhouette inside Viewfinder */}
                  <div className="flex-1 flex flex-col items-center justify-center relative my-1">
                    {/* Crosshair Center */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <div className="w-12 h-12 border border-cyan-400 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                      </div>
                    </div>

                    {/* Stylized Runner with Landmark Overlay Dots */}
                    <div className="flex flex-col items-center relative z-10">
                      {/* Head */}
                      <div className="w-5 h-5 rounded-full border-2 border-cyan-300 bg-cyan-950 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
                      </div>
                      {/* Shoulders & Torso */}
                      <div className="w-10 h-0.5 bg-cyan-400 mt-1" />
                      <div className="w-1.5 h-9 bg-slate-200 rounded-full" />
                      {/* Pelvis bar */}
                      <div className="w-8 h-0.5 bg-cyan-400" />
                      {/* Legs with Joint Dots */}
                      <div className="flex justify-between w-9 mt-0.5">
                        <div className="flex flex-col items-center">
                          <div className="w-1.5 h-6 bg-cyan-300 rotate-[-10deg]" />
                          <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                          <div className="w-1.5 h-7 bg-cyan-300 rotate-[8deg]" />
                          <div className="w-2.5 h-1 bg-white rounded-sm mt-0.5" />
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-1.5 h-6 bg-slate-400 rotate-[15deg]" />
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                          <div className="w-1.5 h-7 bg-slate-400 rotate-[-15deg]" />
                          <div className="w-2.5 h-1 bg-white rounded-sm mt-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* HUD Status Badge */}
                    <div className="absolute bottom-1 right-2 text-[9px] font-mono text-cyan-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-cyan-700">
                      FRAME: 100% IN-VIEW
                    </div>
                  </div>

                  {/* Bottom 20% Margin Indicator */}
                  <div className="w-full bg-cyan-500/10 border-t border-dashed border-cyan-400/60 py-1 px-2 text-center rounded-b-lg">
                    <span className="text-[10px] font-mono font-bold text-cyan-300 flex items-center justify-center gap-1">
                      <span>↑</span>
                      <span>~20% Foot Clearance (Ground Strike Zone)</span>
                      <span>↑</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Framing Checklist (7 cols) */}
              <div className="md:col-span-7 space-y-2.5">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs sm:text-sm">
                      Complete Head-to-Toe Visibility
                    </h4>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Patient must remain completely in the camera frame across all phases of gait,
                      from toe-off to maximum vertical flight.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs sm:text-sm">
                      ~20% Safety Margins (Top & Bottom)
                    </h4>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Maintain a 20% margin above the crown and below the soles to prevent keypoints
                      from clipping the screen edge during vertical oscillation.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs sm:text-sm">
                      Balanced Illumination (Avoid Backlighting)
                    </h4>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Ensure direct, uniform lighting on the runner. Strictly avoid strong
                      backlit windows or direct spotlights behind the patient.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs sm:text-sm">
                      Fitted Attire & Non-Cluttered Background
                    </h4>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Patient should wear form-fitting running attire (shorts/tights) so joint
                      centers (trochanter, condyle, malleolus) are sharply defined.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: Best Angles */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-base uppercase tracking-wider">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF]">
                  <Eye className="w-4 h-4" />
                </div>
                <h3>3. Best Observation Angles</h3>
              </div>
              <span className="text-xs text-slate-400">
                Primary Clinical Planes for Gait Diagnostics
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Angle 1: SAGITTAL VIEW (Lateral) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    SAGITTAL (Side View)
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    Primary Baseline Angle
                  </span>
                </div>

                {/* CSS Visual Diagram for Sagittal View */}
                <div className="relative w-full h-44 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-around px-4 overflow-hidden">
                  {/* Runner Silhouette in Sagittal View */}
                  <div className="relative flex flex-col items-center">
                    {/* Head */}
                    <div className="w-5 h-5 rounded-full border border-cyan-400 bg-cyan-950" />
                    {/* Trunk Lean Line & Angle Arc */}
                    <div className="relative">
                      <div className="w-1.5 h-10 bg-slate-200 rotate-[8deg] origin-top rounded-full my-0.5" />
                      {/* Forward trunk lean arc indicator */}
                      <span className="absolute -left-12 top-2 text-[9px] font-mono font-bold text-cyan-300 bg-slate-900/90 px-1 rounded border border-cyan-500/30">
                        Lean 7°
                      </span>
                    </div>

                    {/* Pelvis & Legs */}
                    <div className="relative flex justify-center">
                      {/* Stance leg with Knee Flexion arc */}
                      <div className="flex flex-col items-center">
                        <div className="w-1.5 h-8 bg-cyan-400 rotate-[-15deg]" />
                        {/* Knee Joint Dot */}
                        <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
                        <div className="w-1.5 h-9 bg-cyan-400 rotate-[12deg]" />
                        <div className="w-3 h-1 bg-white rounded-sm" />
                      </div>
                      {/* Knee Flexion Angle Badge */}
                      <span className="absolute -right-14 top-6 text-[9px] font-mono font-bold text-[#00E5FF] bg-slate-900/90 px-1 rounded border border-cyan-500/30">
                        Flexion 42°
                      </span>
                    </div>
                  </div>

                  {/* Overstride Plumb Line Illustration */}
                  <div className="flex flex-col justify-center space-y-1.5 text-[11px] font-mono text-slate-300">
                    <div className="flex items-center gap-1.5 text-cyan-300">
                      <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                      <span>Trunk Forward Lean</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-cyan-300">
                      <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                      <span>Knee Flexion at Contact</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-cyan-300">
                      <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                      <span>Overstride Vector</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-cyan-300">
                      <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                      <span>Vertical Oscillation</span>
                    </div>
                  </div>
                </div>

                {/* Best for bullet list */}
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="text-white font-bold text-[11px] uppercase tracking-wider text-cyan-400">
                    Best Clinical Indicators:
                  </div>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>
                        <strong>Knee Flexion:</strong> Mid-stance shock absorption & peak swing.
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>
                        <strong>Trunk Lean:</strong> Forward torso angle (nominal 4°-10°).
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>
                        <strong>Overstride Analysis:</strong> Foot strike distance relative to COM.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Angle 2: FRONTAL VIEW (Anterior / Posterior) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    FRONTAL (Front / Back View)
                  </span>
                  <span className="text-[11px] font-mono text-cyan-300 font-bold">
                    Bilateral Symmetry Angle
                  </span>
                </div>

                {/* CSS Visual Diagram for Frontal View */}
                <div className="relative w-full h-44 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-around px-4 overflow-hidden">
                  {/* Runner Silhouette in Frontal View */}
                  <div className="relative flex flex-col items-center">
                    {/* Head */}
                    <div className="w-5 h-5 rounded-full border border-blue-400 bg-blue-950" />
                    {/* Shoulders */}
                    <div className="w-12 h-0.5 bg-slate-300 mt-1" />
                    <div className="w-1.5 h-9 bg-slate-200 rounded-full" />

                    {/* Pelvic Line (Drop / Tilt) */}
                    <div className="relative w-11 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-cyan-400 rotate-[-4deg]" />
                      <span className="absolute -left-12 -top-2 text-[9px] font-mono text-cyan-300 bg-slate-900/90 px-1 rounded border border-cyan-500/30">
                        Tilt 2.1°
                      </span>
                    </div>

                    {/* Legs with Knee Valgus / Varus lines */}
                    <div className="flex justify-between w-9 mt-0.5">
                      <div className="flex flex-col items-center">
                        <div className="w-1.5 h-7 bg-cyan-400 rotate-[4deg]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
                        <div className="w-1.5 h-8 bg-cyan-400 rotate-[-4deg]" />
                        <div className="w-2.5 h-1 bg-white rounded-sm" />
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-1.5 h-7 bg-cyan-400 rotate-[-3deg]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
                        <div className="w-1.5 h-8 bg-cyan-400 rotate-[3deg]" />
                        <div className="w-2.5 h-1 bg-white rounded-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Frontal Diagnostic Features */}
                  <div className="flex flex-col justify-center space-y-1.5 text-[11px] font-mono text-slate-300">
                    <div className="flex items-center gap-1.5 text-blue-300">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Pelvic Drop (Trendelenburg)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-300">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Knee Valgus / Varus Collapse</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-300">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Arm Swing Symmetry &amp; Crossover</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-300">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Foot Progression / Crossover</span>
                    </div>
                  </div>
                </div>

                {/* Best for bullet list */}
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="text-white font-bold text-[11px] uppercase tracking-wider text-cyan-400">
                    Best Clinical Indicators:
                  </div>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>
                        <strong>Pelvic Drop:</strong> Hip abductor / gluteus medius stability.
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>
                        <strong>Valgus / Varus:</strong> Medial knee collapse &amp; Q-angle
                        tracking.
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>
                        <strong>Arm Swing Symmetry:</strong> Torso rotational counter-balance.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: Quick Tips */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm uppercase tracking-wider">
              <Info className="w-4 h-4 text-cyan-400" />
              <h3>4. Quick Clinical Acquisition Tips</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Stable Camera Rig</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Use a rigid tripod. Micro-vibrations or handheld jitter produce false-positive
                  cadence &amp; acceleration noise.
                </p>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Avoid Reflective Surfaces</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Eliminate gym mirrors or glass partitions behind patient to prevent phantom joint
                  detections by neural network.
                </p>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Start with Sagittal View</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  The lateral profile captures &gt;80% of primary gait deficiencies (overstride,
                  knee flexion, trunk lean, cadence).
                </p>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>External HD / 60 FPS Sensor</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  For medical-grade precision, an external HD USB camera operating at 60 FPS is
                  recommended to prevent foot motion blur.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-5 sm:px-7 py-4 bg-slate-900/90 border-t border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Tip: You can re-open this guide anytime using the{' '}
              <strong className="text-cyan-300 font-mono">?</strong> button in the live telemetry
              header.
            </span>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-[#00E5FF] to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition"
          >
            <span>Got it, Start Tracking</span>
            <ArrowRight className="w-4 h-4 text-slate-950 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientPositioningGuide;
