import type { Landmark3D } from '../types/runner';

/**
 * Generates synthetic 33-keypoint BlazePose anatomical landmarks for a realistic
 * running gait cycle.
 */
export function generateSimulatedRunnerLandmarks(
  phase: number,
  _speedKmh: number = 10,
  hasKneeAsymmetry: boolean = false
): Landmark3D[] {
  const landmarks: Landmark3D[] = new Array(33);

  // Stride angles
  const cycleRad = phase * Math.PI * 2;
  const leftPhase = cycleRad;
  const rightPhase = cycleRad + Math.PI; // 180 degrees counter-phase

  // Center of mass vertical oscillation (sinusoidal bounce with 2 bounces per full stride)
  const verticalBounce = Math.sin(cycleRad * 2) * 0.025;
  const baseY = 0.48 + verticalBounce;
  const baseX = 0.50;

  // Trunk forward lean (~7 degrees)
  const torsoLeanAngle = 0.12; // radians
  const torsoHeight = 0.22;

  // Head & Neck
  const noseY = baseY - torsoHeight - 0.08;
  const noseX = baseX + Math.sin(torsoLeanAngle) * 0.06;

  landmarks[0] = { x: noseX, y: noseY, z: 0, visibility: 0.99 }; // Nose
  landmarks[1] = { x: noseX - 0.01, y: noseY - 0.01, z: 0.02, visibility: 0.95 };
  landmarks[2] = { x: noseX - 0.015, y: noseY - 0.01, z: 0.03, visibility: 0.95 };
  landmarks[3] = { x: noseX - 0.02, y: noseY - 0.01, z: 0.04, visibility: 0.95 };
  landmarks[4] = { x: noseX + 0.01, y: noseY - 0.01, z: -0.02, visibility: 0.95 };
  landmarks[5] = { x: noseX + 0.015, y: noseY - 0.01, z: -0.03, visibility: 0.95 };
  landmarks[6] = { x: noseX + 0.02, y: noseY - 0.01, z: -0.04, visibility: 0.95 };
  landmarks[7] = { x: noseX - 0.035, y: noseY, z: 0.05, visibility: 0.95 };
  landmarks[8] = { x: noseX + 0.035, y: noseY, z: -0.05, visibility: 0.95 };
  landmarks[9] = { x: noseX - 0.01, y: noseY + 0.02, z: 0.01, visibility: 0.95 };
  landmarks[10] = { x: noseX + 0.01, y: noseY + 0.02, z: -0.01, visibility: 0.95 };

  // Shoulders (counter-rotating with arms)
  const shoulderWidth = 0.08;
  const shoulderY = baseY - torsoHeight;
  const shoulderX = baseX + Math.sin(torsoLeanAngle) * torsoHeight;
  landmarks[11] = { x: shoulderX, y: shoulderY, z: shoulderWidth, visibility: 0.99 }; // Left
  landmarks[12] = { x: shoulderX, y: shoulderY, z: -shoulderWidth, visibility: 0.99 }; // Right

  // Arm Swing
  const armAmp = 0.12;
  const leftArmX = shoulderX + Math.sin(rightPhase) * armAmp;
  const rightArmX = shoulderX + Math.sin(leftPhase) * armAmp;

  // Elbows
  landmarks[13] = { x: shoulderX + (leftArmX - shoulderX) * 0.5 - 0.02, y: shoulderY + 0.09, z: shoulderWidth + 0.04, visibility: 0.98 };
  landmarks[14] = { x: shoulderX + (rightArmX - shoulderX) * 0.5 - 0.02, y: shoulderY + 0.09, z: -shoulderWidth - 0.04, visibility: 0.98 };

  // Wrists & Hands
  landmarks[15] = { x: leftArmX, y: shoulderY + 0.06 - Math.sin(rightPhase) * 0.05, z: shoulderWidth + 0.02, visibility: 0.98 };
  landmarks[16] = { x: rightArmX, y: shoulderY + 0.06 - Math.sin(leftPhase) * 0.05, z: -shoulderWidth - 0.02, visibility: 0.98 };
  landmarks[17] = { x: landmarks[15].x + 0.01, y: landmarks[15].y + 0.01, z: landmarks[15].z, visibility: 0.95 };
  landmarks[18] = { x: landmarks[16].x + 0.01, y: landmarks[16].y + 0.01, z: landmarks[16].z, visibility: 0.95 };
  landmarks[19] = { x: landmarks[15].x + 0.02, y: landmarks[15].y + 0.02, z: landmarks[15].z, visibility: 0.95 };
  landmarks[20] = { x: landmarks[16].x + 0.02, y: landmarks[16].y + 0.02, z: landmarks[16].z, visibility: 0.95 };
  landmarks[21] = { x: landmarks[15].x + 0.01, y: landmarks[15].y, z: landmarks[15].z, visibility: 0.95 };
  landmarks[22] = { x: landmarks[16].x + 0.01, y: landmarks[16].y, z: landmarks[16].z, visibility: 0.95 };

  // Hips
  const hipWidth = 0.06;
  landmarks[23] = { x: baseX, y: baseY, z: hipWidth, visibility: 0.99 }; // Left Hip
  landmarks[24] = { x: baseX, y: baseY, z: -hipWidth, visibility: 0.99 }; // Right Hip

  // Leg Kinematics
  const thighLength = 0.19;
  const shankLength = 0.20;

  // Left Leg Simulation
  const leftHipAngle = Math.sin(leftPhase) * 0.55;
  const leftKneeBaseFlex = (Math.sin(leftPhase - 0.6) + 1) * 0.5;
  const leftKneeAngle = leftHipAngle - (0.4 + leftKneeBaseFlex * 0.9);

  const leftKneeX = baseX + Math.sin(leftHipAngle) * thighLength;
  const leftKneeY = baseY + Math.cos(leftHipAngle) * thighLength;
  landmarks[25] = { x: leftKneeX, y: leftKneeY, z: hipWidth, visibility: 0.99 };

  const leftAnkleX = leftKneeX + Math.sin(leftKneeAngle) * shankLength;
  const leftAnkleY = Math.min(0.92, leftKneeY + Math.cos(leftKneeAngle) * shankLength);
  landmarks[27] = { x: leftAnkleX, y: leftAnkleY, z: hipWidth, visibility: 0.99 };
  landmarks[29] = { x: leftAnkleX - 0.025, y: leftAnkleY + 0.02, z: hipWidth, visibility: 0.98 };
  landmarks[31] = { x: leftAnkleX + 0.045, y: leftAnkleY + 0.025, z: hipWidth, visibility: 0.98 };

  // Right Leg Simulation
  const rightHipAngle = Math.sin(rightPhase) * 0.55;
  const asymFactor = hasKneeAsymmetry ? 0.7 : 1.0;
  const rightKneeBaseFlex = (Math.sin(rightPhase - 0.6) + 1) * 0.5 * asymFactor;
  const rightKneeAngle = rightHipAngle - (0.4 + rightKneeBaseFlex * 0.9);

  const rightKneeX = baseX + Math.sin(rightHipAngle) * thighLength;
  const rightKneeY = baseY + Math.cos(rightHipAngle) * thighLength;
  landmarks[26] = { x: rightKneeX, y: rightKneeY, z: -hipWidth, visibility: 0.99 };

  const rightAnkleX = rightKneeX + Math.sin(rightKneeAngle) * shankLength;
  const rightAnkleY = Math.min(0.92, rightKneeY + Math.cos(rightKneeAngle) * shankLength);
  landmarks[28] = { x: rightAnkleX, y: rightAnkleY, z: -hipWidth, visibility: 0.99 };
  landmarks[30] = { x: rightAnkleX - 0.025, y: rightAnkleY + 0.02, z: -hipWidth, visibility: 0.98 };
  landmarks[32] = { x: rightAnkleX + 0.045, y: rightAnkleY + 0.025, z: -hipWidth, visibility: 0.98 };

  return landmarks;
}

/**
 * Generates synthetic 33-keypoint landmarks for a Vertical Countermovement Jump.
 * Cycle phases:
 * 0.00 - 0.25: Quiet standing
 * 0.25 - 0.45: Squat countermovement dip (eccentric)
 * 0.45 - 0.55: Explosive push-off (propulsion)
 * 0.55 - 0.80: Airborne flight phase (ballistic parabola, apex reached at 0.675)
 * 0.80 - 0.90: Impact landing & shock absorption
 * 0.90 - 1.00: Return to quiet standing
 */
export function generateSimulatedJumpLandmarks(phase: number): Landmark3D[] {
  const landmarks: Landmark3D[] = new Array(33);
  const baseX = 0.50;
  const standingBaseY = 0.52;

  let bodyDeltaY = 0;
  let kneeFlex = 0; // 0 = straight, 1 = deep squat

  if (phase < 0.25) {
    // Quiet standing
    bodyDeltaY = 0;
    kneeFlex = 0.05;
  } else if (phase < 0.45) {
    // Squat dip
    const sub = (phase - 0.25) / 0.20;
    const dip = Math.sin(sub * Math.PI) * 0.12; // dips downward
    bodyDeltaY = dip;
    kneeFlex = 0.05 + dip * 6;
  } else if (phase < 0.55) {
    // Push off
    const sub = (phase - 0.45) / 0.10;
    bodyDeltaY = 0.05 * (1 - sub);
    kneeFlex = 0.2 * (1 - sub);
  } else if (phase < 0.80) {
    // Airborne Flight
    const sub = (phase - 0.55) / 0.25;
    const flightArc = Math.sin(sub * Math.PI) * 0.24; // parabolic apex
    bodyDeltaY = -flightArc; // upward
    kneeFlex = 0.15;
  } else if (phase < 0.90) {
    // Landing absorption
    const sub = (phase - 0.80) / 0.10;
    const absorb = Math.sin(sub * Math.PI) * 0.08;
    bodyDeltaY = absorb;
    kneeFlex = 0.05 + absorb * 5;
  } else {
    // Return to standing
    bodyDeltaY = 0;
    kneeFlex = 0.05;
  }

  const baseY = standingBaseY + bodyDeltaY;
  const torsoHeight = 0.22;
  const noseY = baseY - torsoHeight - 0.08;

  // Head
  landmarks[0] = { x: baseX, y: noseY, z: 0, visibility: 0.99 };
  for (let i = 1; i <= 10; i++) {
    landmarks[i] = { x: baseX, y: noseY, z: 0, visibility: 0.95 };
  }

  // Shoulders
  const shoulderY = baseY - torsoHeight;
  landmarks[11] = { x: baseX - 0.08, y: shoulderY, z: 0.06, visibility: 0.99 };
  landmarks[12] = { x: baseX + 0.08, y: shoulderY, z: -0.06, visibility: 0.99 };

  // Arms: during dip arms swing back, during jump arms swing up!
  const armUp = phase >= 0.45 && phase <= 0.80 ? -0.15 : 0.08;
  landmarks[13] = { x: baseX - 0.10, y: shoulderY + 0.06 + armUp, z: 0.08, visibility: 0.98 };
  landmarks[14] = { x: baseX + 0.10, y: shoulderY + 0.06 + armUp, z: -0.08, visibility: 0.98 };
  landmarks[15] = { x: baseX - 0.12, y: shoulderY + 0.14 + armUp * 1.5, z: 0.08, visibility: 0.98 };
  landmarks[16] = { x: baseX + 0.12, y: shoulderY + 0.14 + armUp * 1.5, z: -0.08, visibility: 0.98 };
  for (let i = 17; i <= 22; i++) {
    landmarks[i] = { x: baseX, y: shoulderY + 0.15 + armUp * 1.5, z: 0, visibility: 0.95 };
  }

  // Hips
  landmarks[23] = { x: baseX - 0.06, y: baseY, z: 0.05, visibility: 0.99 };
  landmarks[24] = { x: baseX + 0.06, y: baseY, z: -0.05, visibility: 0.99 };

  // Legs
  const thigh = 0.18;
  const shank = 0.19;

  // Knee coordinates
  const kneeY = baseY + Math.cos(kneeFlex) * thigh;
  const kneeXOffset = Math.sin(kneeFlex) * thigh * 0.4;

  landmarks[25] = { x: baseX - 0.06 - kneeXOffset, y: kneeY, z: 0.05, visibility: 0.99 };
  landmarks[26] = { x: baseX + 0.06 + kneeXOffset, y: kneeY, z: -0.05, visibility: 0.99 };

  // Ankle coordinates
  const ankleY = kneeY + Math.cos(kneeFlex * 0.5) * shank;
  landmarks[27] = { x: baseX - 0.06, y: ankleY, z: 0.05, visibility: 0.99 };
  landmarks[28] = { x: baseX + 0.06, y: ankleY, z: -0.05, visibility: 0.99 };

  // Feet
  landmarks[29] = { x: baseX - 0.08, y: ankleY + 0.02, z: 0.05, visibility: 0.98 };
  landmarks[30] = { x: baseX + 0.04, y: ankleY + 0.02, z: -0.05, visibility: 0.98 };
  landmarks[31] = { x: baseX - 0.02, y: ankleY + 0.025, z: 0.05, visibility: 0.98 };
  landmarks[32] = { x: baseX + 0.10, y: ankleY + 0.025, z: -0.05, visibility: 0.98 };

  return landmarks;
}
