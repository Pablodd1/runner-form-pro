import math
import subprocess
import os
from PIL import Image, ImageDraw

def generate_video():
    width, height = 1280, 720
    fps = 30
    duration_sec = 6
    total_frames = fps * duration_sec
    stride_rate_hz = 2.8 # ~168 steps per minute

    out_mp4 = os.path.join("public", "sample_runner.mp4")
    out_webm = os.path.join("public", "sample_runner.webm")

    print(f"Generating {total_frames} frames of running gait video...")

    # Start ffmpeg process for mp4
    cmd_mp4 = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{width}x{height}",
        "-pix_fmt", "rgb24",
        "-r", str(fps),
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "22",
        out_mp4
    ]

    proc_mp4 = subprocess.Popen(cmd_mp4, stdin=subprocess.PIPE)

    for f in range(total_frames):
        t = f / fps
        phase = (t * stride_rate_hz) % 1.0
        cycle = phase * 2 * math.pi

        img = Image.new("RGB", (width, height), (15, 23, 42))
        draw = ImageDraw.Draw(img)

        # Draw Floor & Treadmill
        draw.rectangle([0, 560, width, height], fill=(11, 15, 25))
        draw.rectangle([180, 550, 1100, 570], fill=(30, 41, 59))
        draw.line([180, 550, 1100, 550], fill=(0, 229, 255), width=3)

        # Treadmill belt moving tick marks
        belt_shift = int((f * 22) % 120)
        for x in range(180 - belt_shift, 1100, 80):
            if x >= 180 and x + 30 <= 1100:
                draw.line([x, 562, x + 30, 562], fill=(56, 189, 248), width=3)

        # Runner Center of Mass (Pelvis / Hip)
        # Vertical bounce: 2 bounces per full stride (left and right step)
        vert_bounce = math.sin(cycle * 2) * 16
        base_x = 640
        base_y = 380 + vert_bounce

        # Torso (leaning slightly forward ~7 deg)
        lean_angle = 0.12 # radians
        torso_len = 130
        shoulder_x = base_x + math.sin(lean_angle) * torso_len
        shoulder_y = base_y - math.cos(lean_angle) * torso_len

        # Head & Neck
        head_radius = 26
        neck_len = 25
        head_center_x = shoulder_x + math.sin(lean_angle) * neck_len
        head_center_y = shoulder_y - math.cos(lean_angle) * neck_len - head_radius

        # Legs Kinematics (Left and Right 180 deg out of phase)
        thigh_len = 115
        shin_len = 110

        # Angles for Left Leg
        # Thigh swings from -25 deg to +35 deg
        l_thigh_angle = math.sin(cycle) * 0.55 + 0.1
        l_knee_x = base_x + math.sin(l_thigh_angle) * thigh_len
        l_knee_y = base_y + math.cos(l_thigh_angle) * thigh_len

        # Knee flexion increases during swing phase (when thigh is moving forward/up)
        l_knee_flex = max(0.2, (math.sin(cycle - 0.8) + 1.0) * 0.6)
        l_shin_angle = l_thigh_angle - l_knee_flex
        l_ankle_x = l_knee_x - math.sin(l_shin_angle) * shin_len
        l_ankle_y = l_knee_y + math.cos(l_shin_angle) * shin_len

        l_toe_x = l_ankle_x + 35
        l_toe_y = l_ankle_y + 12

        # Angles for Right Leg (phase shifted by pi)
        r_cycle = cycle + math.pi
        r_thigh_angle = math.sin(r_cycle) * 0.55 + 0.1
        r_knee_x = base_x + math.sin(r_thigh_angle) * thigh_len
        r_knee_y = base_y + math.cos(r_thigh_angle) * thigh_len

        r_knee_flex = max(0.2, (math.sin(r_cycle - 0.8) + 1.0) * 0.6)
        r_shin_angle = r_thigh_angle - r_knee_flex
        r_ankle_x = r_knee_x - math.sin(r_shin_angle) * shin_len
        r_ankle_y = r_knee_y + math.cos(r_shin_angle) * shin_len

        r_toe_x = r_ankle_x + 35
        r_toe_y = r_ankle_y + 12

        # Arms Kinematics (opposite to legs)
        arm_len = 80
        forearm_len = 75

        # Left Arm (matches right leg rhythm)
        l_arm_angle = -math.sin(cycle) * 0.6
        l_elbow_x = shoulder_x + math.sin(l_arm_angle) * arm_len
        l_elbow_y = shoulder_y + math.cos(l_arm_angle) * arm_len
        l_wrist_x = l_elbow_x + math.sin(l_arm_angle + 1.2) * forearm_len
        l_wrist_y = l_elbow_y - math.cos(l_arm_angle + 1.2) * forearm_len

        # Right Arm
        r_arm_angle = -math.sin(r_cycle) * 0.6
        r_elbow_x = shoulder_x + math.sin(r_arm_angle) * arm_len
        r_elbow_y = shoulder_y + math.cos(r_arm_angle) * arm_len
        r_wrist_x = r_elbow_x + math.sin(r_arm_angle + 1.2) * forearm_len
        r_wrist_y = r_elbow_y - math.cos(r_arm_angle + 1.2) * forearm_len

        # DRAW ORDER: Back Arm -> Back Leg -> Torso & Head -> Front Leg -> Front Arm

        # 1. Back Leg (Right) - slightly darker
        leg_color_r = (30, 64, 175)
        skin_color_r = (180, 140, 110)
        draw.line([base_x, base_y, r_knee_x, r_knee_y], fill=leg_color_r, width=22)
        draw.line([r_knee_x, r_knee_y, r_ankle_x, r_ankle_y], fill=skin_color_r, width=18)
        # Shoe
        draw.line([r_ankle_x - 10, r_ankle_y + 8, r_toe_x, r_toe_y], fill=(220, 220, 240), width=16)

        # 2. Back Arm (Right)
        draw.line([shoulder_x, shoulder_y, r_elbow_x, r_elbow_y], fill=(14, 116, 144), width=16)
        draw.line([r_elbow_x, r_elbow_y, r_wrist_x, r_wrist_y], fill=skin_color_r, width=14)

        # 3. Torso (Athletic running shirt & shorts)
        draw.line([shoulder_x, shoulder_y, base_x, base_y], fill=(6, 182, 212), width=36)
        # Pelvis/Shorts
        draw.ellipse([base_x - 22, base_y - 20, base_x + 22, base_y + 20], fill=(30, 41, 59))

        # 4. Head & Neck
        draw.ellipse([head_center_x - head_radius, head_center_y - head_radius,
                      head_center_x + head_radius, head_center_y + head_radius], fill=(220, 175, 140))
        # Hair/Cap
        draw.arc([head_center_x - head_radius, head_center_y - head_radius,
                  head_center_x + head_radius, head_center_y + head_radius],
                 start=180, end=360, fill=(30, 41, 59), width=8)

        # 5. Front Leg (Left) - brighter
        leg_color_l = (37, 99, 235)
        skin_color_l = (220, 175, 140)
        draw.line([base_x, base_y, l_knee_x, l_knee_y], fill=leg_color_l, width=24)
        draw.line([l_knee_x, l_knee_y, l_ankle_x, l_ankle_y], fill=skin_color_l, width=20)
        # Shoe
        draw.line([l_ankle_x - 10, l_ankle_y + 8, l_toe_x, l_toe_y], fill=(255, 255, 255), width=18)
        draw.line([l_ankle_x, l_ankle_y + 6, l_toe_x - 4, l_toe_y - 2], fill=(0, 229, 255), width=6)

        # 6. Front Arm (Left)
        draw.line([shoulder_x, shoulder_y, l_elbow_x, l_elbow_y], fill=(8, 145, 178), width=18)
        draw.line([l_elbow_x, l_elbow_y, l_wrist_x, l_wrist_y], fill=skin_color_l, width=16)

        # Subtle text watermark
        draw.text((30, 30), "CLINICAL RUNNER FORM TEST GAIT • 30 FPS", fill=(100, 116, 139))

        proc_mp4.stdin.write(img.tobytes())

    proc_mp4.stdin.close()
    proc_mp4.wait()
    print(f"Generated {out_mp4} successfully.")

    # Also convert to webm for browser versatility
    print("Converting to webm...")
    subprocess.run([
        "ffmpeg", "-y",
        "-i", out_mp4,
        "-c:v", "libvpx-vp9",
        "-crf", "30",
        "-b:v", "0",
        out_webm
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Generated {out_webm} successfully.")

if __name__ == "__main__":
    generate_video()
