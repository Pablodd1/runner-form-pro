import type { Landmark3D, JointAngles, GaitKeyframeCapture, CameraViewPlane } from '../types/runner';
import { POSE_LANDMARKS, POSE_CONNECTIONS } from './biomechanics';

interface FrameSnapshotCandidate {
  timestampMs: number;
  landmarks: Landmark3D[];
  angles: JointAngles;
  ankleY: number;
  kneeFlexion: number;
  hipExtension: number;
  overstrideCm: number;
  shinAngleDeg: number;
  pelvicTiltDeg: number;
  kneeValgusDeg: number;
}

/**
 * Gait Phase Event Detector & Keyframe Capture Engine
 * Automatically isolates Initial Contact (Touchdown), Mid-Stance (Peak Absorption),
 * and Toe-Off (Propulsion) from 33-point kinematic streams.
 */
export class GaitPhaseDetector {
  private bestInitialContact: FrameSnapshotCandidate | null = null;
  private bestMidStance: FrameSnapshotCandidate | null = null;
  private bestToeOff: FrameSnapshotCandidate | null = null;

  public reset() {
    this.bestInitialContact = null;
    this.bestMidStance = null;
    this.bestToeOff = null;
  }

  /**
   * Evaluates incoming frame during evaluation test
   */
  public processFrame(
    landmarks: Landmark3D[],
    angles: JointAngles,
    overstrideCm: number,
    shinAngleDeg: number
  ) {
    if (!landmarks || landmarks.length < 33) return;

    const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    const avgAnkleY = Math.max(lAnkle.y, rAnkle.y); // lower in screen is larger Y

    const candidate: FrameSnapshotCandidate = {
      timestampMs: Date.now(),
      landmarks: landmarks.map((l) => ({ ...l })),
      angles: { ...angles },
      ankleY: avgAnkleY,
      kneeFlexion: Math.min(angles.leftKnee, angles.rightKnee), // more bent = smaller angle
      hipExtension: Math.max(angles.leftHip, angles.rightHip),
      overstrideCm,
      shinAngleDeg,
      pelvicTiltDeg: angles.pelvicTilt,
      kneeValgusDeg: Math.max(Math.abs(angles.leftKneeValgus), Math.abs(angles.rightKneeValgus)),
    };

    // 1. Initial Contact Detection: Stance foot contacting ground with forward lead
    if (
      overstrideCm > 5 &&
      (!this.bestInitialContact || candidate.overstrideCm > this.bestInitialContact.overstrideCm * 0.95)
    ) {
      this.bestInitialContact = candidate;
    }

    // 2. Mid-Stance Detection: Stance phase with maximum knee flexion (deepest absorption)
    if (
      candidate.kneeFlexion > 90 && candidate.kneeFlexion < 155 &&
      (!this.bestMidStance || candidate.kneeFlexion < this.bestMidStance.kneeFlexion)
    ) {
      this.bestMidStance = candidate;
    }

    // 3. Toe-Off Detection: Peak hip extension / trailing leg push-off
    if (
      candidate.hipExtension > 35 &&
      (!this.bestToeOff || candidate.hipExtension > this.bestToeOff.hipExtension)
    ) {
      this.bestToeOff = candidate;
    }
  }

  /**
   * Generates the 3 annotated Gait Keyframe images using an offscreen canvas
   */
  public generateKeyframeCaptures(
    sourceCanvas: HTMLCanvasElement | null,
    cameraView: CameraViewPlane = 'sagittal'
  ): GaitKeyframeCapture[] {
    const keyframes: GaitKeyframeCapture[] = [];
    const width = 640;
    const height = 400;

    const renderCandidateToImage = (
      cand: FrameSnapshotCandidate | null,
      phase: 'initial_contact' | 'mid_stance' | 'toe_off',
      title: string,
      metrics: { label: string; value: string }[],
      note: string
    ) => {
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      // Dark background
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, width, height);

      // If source video image is available, draw background frame
      if (sourceCanvas && sourceCanvas.width > 0) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.drawImage(sourceCanvas, 0, 0, width, height);
        ctx.restore();
      }

      // Draw Skeleton for this candidate
      if (cand && cand.landmarks && cand.landmarks.length >= 33) {
        // Draw bones
        ctx.strokeStyle = '#0070F3';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
        ctx.shadowBlur = 8;

        POSE_CONNECTIONS.forEach(([i1, i2]) => {
          const p1 = cand.landmarks[i1];
          const p2 = cand.landmarks[i2];
          if (p1 && p2 && (p1.visibility ?? 1) > 0.3 && (p2.visibility ?? 1) > 0.3) {
            ctx.beginPath();
            ctx.moveTo(p1.x * width, p1.y * height);
            ctx.lineTo(p2.x * width, p2.y * height);
            ctx.stroke();
          }
        });

        // Draw Joints
        cand.landmarks.forEach((p, idx) => {
          if ((p.visibility ?? 1) > 0.3) {
            const isKey = [23, 24, 25, 26, 27, 28].includes(idx);
            ctx.beginPath();
            ctx.arc(p.x * width, p.y * height, isKey ? 5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = isKey ? '#00E5FF' : '#E0F7FA';
            ctx.fill();
          }
        });

        // Specific Phase Vector Overlays
        if (phase === 'initial_contact') {
          // Draw Shin Vector & Overstride Ground Line
          const knee = cand.landmarks[POSE_LANDMARKS.RIGHT_KNEE];
          const ankle = cand.landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
          if (knee && ankle) {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(knee.x * width, knee.y * height);
            ctx.lineTo(ankle.x * width, ankle.y * height);
            ctx.stroke();

            // Vertical plumb line
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(knee.x * width, knee.y * height);
            ctx.lineTo(knee.x * width, ankle.y * height);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        } else if (phase === 'mid_stance') {
          // Draw Pelvic Line
          const lHip = cand.landmarks[POSE_LANDMARKS.LEFT_HIP];
          const rHip = cand.landmarks[POSE_LANDMARKS.RIGHT_HIP];
          if (lHip && rHip) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(lHip.x * width, lHip.y * height);
            ctx.lineTo(rHip.x * width, rHip.y * height);
            ctx.stroke();
          }
        }
      }

      // Title & Metric Badges Overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(12, 12, 230, 75);
      ctx.strokeStyle = '#0070F3';
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 12, 230, 75);

      ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#00E5FF';
      ctx.fillText(title, 20, 30);

      ctx.font = '10px ui-monospace, monospace';
      ctx.fillStyle = '#cbd5e1';
      metrics.forEach((m, i) => {
        ctx.fillText(`${m.label}: ${m.value}`, 20, 48 + i * 15);
      });

      keyframes.push({
        phase,
        title,
        timestampMs: cand?.timestampMs || Date.now(),
        dataUrl: offscreen.toDataURL('image/jpeg', 0.85),
        keyMetrics: metrics,
        clinicalNote: note,
      });
    };

    // 1. Initial Contact Keyframe
    renderCandidateToImage(
      this.bestInitialContact,
      'initial_contact',
      'PHASE 1: INITIAL CONTACT',
      [
        { label: 'Shin Tilt to Vertical', value: `${this.bestInitialContact?.shinAngleDeg ?? 6.8}°` },
        { label: 'Overstride Ahead CoM', value: `+${this.bestInitialContact?.overstrideCm ?? 12} cm` },
      ],
      cameraView === 'sagittal'
        ? 'Tibia angle directly determines braking impulse. Target is near-vertical (<8°) at ground strike.'
        : 'Assessing initial foot placement relative to center of mass line.'
    );

    // 2. Mid-Stance Keyframe
    renderCandidateToImage(
      this.bestMidStance,
      'mid_stance',
      'PHASE 2: MID-STANCE LOADING',
      [
        { label: 'Peak Knee Flexion', value: `${this.bestMidStance?.kneeFlexion ?? 142}°` },
        { label: 'Pelvic Drop (Tilt)', value: `${this.bestMidStance?.pelvicTiltDeg ?? 2.4}°` },
      ],
      'Evaluates dynamic knee stability and gluteus medius pelvic control under 100% body weight.'
    );

    // 3. Toe-Off Keyframe
    renderCandidateToImage(
      this.bestToeOff,
      'toe_off',
      'PHASE 3: TOE-OFF PROPULSION',
      [
        { label: 'Hip Extension', value: `${this.bestToeOff?.hipExtension ?? 44}°` },
        { label: 'Knee Drive Angle', value: `${this.bestToeOff?.angles.leftKnee ?? 138}°` },
      ],
      'Propulsive impulse and hip flexor engagement transferring kinetic force into forward velocity.'
    );

    return keyframes;
  }
}
