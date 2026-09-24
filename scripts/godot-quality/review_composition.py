"""Run the actual Forward+ P1 scene. Keep structural success separate from visual approval."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "docs/godot-quality/reports"
EVIDENCE = ROOT / "docs/godot-quality/evidence"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--godot", default=r"D:\Godot_v4.7.2-stable_win64.exe")
    parser.add_argument("--height", type=int, choices=[720, 1080], default=1080)
    parser.add_argument("--routes", action="store_true")
    parser.add_argument("--p2", action="store_true")
    parser.add_argument("--controlled", action="store_true", help="Unapproved skeletal sample in P2 layout")
    parser.add_argument("--style", action="store_true", help="Static S/SE style gate in P2 layout")
    parser.add_argument("--character2d", action="store_true", help="Complete 2D S/SE illustration gate in P2 layout")
    parser.add_argument("--character2d256", action="store_true", help="Independent 256x256 PNG/SpriteFrames proof")
    parser.add_argument("--character2d-motion", action="store_true", help="Incomplete 5-frame complete-2D motion diagnostic")
    parser.add_argument("--character2d-batch", action="store_true", help="Unapproved 8-walk/12-thrust full-2D batch diagnostic")
    args = parser.parse_args()
    if sum([args.character2d, args.character2d256, args.character2d_motion, args.character2d_batch]) > 1 or ((args.character2d or args.character2d256 or args.character2d_motion or args.character2d_batch) and (args.style or args.controlled or args.routes)):
        parser.error("2D static checks are separate gates")
    REPORT.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env["APPDATA"] = str(ROOT / ".tmp/godot-quality/profile")
    prefix = "p2-character-2d-batch-v1" if args.character2d_batch else ("p2-character-2d-motion-v1" if args.character2d_motion else ("p2-character-2d-256-v1" if args.character2d256 else ("p2-character-2d-v1" if args.character2d else ("p2-style-gate-v2" if args.style else ("p2-controlled-rig" if args.controlled else ("p2-refined" if args.p2 else "composition"))))))
    scene = "composition-refined" if args.p2 or args.controlled or args.style or args.character2d or args.character2d256 or args.character2d_motion or args.character2d_batch else "composition-review"
    log = REPORT / f"{prefix}-{args.height}-engine.log"
    command = [args.godot, "--path", str(ROOT / "godot/linshui-quality"),
               f"res://scenes/validation/{scene}.tscn",
               "--resolution", f"{args.height * 16 // 9}x{args.height}",
               "--position", "0,0", "--log-file", str(log),
               "--", f"--composition-evidence={EVIDENCE}"]
    if args.routes:
        command.append("--route-test")
    if args.controlled:
        command.append("--controlled-source=" + str(ROOT / "art_source/linshui-quality/v1/characters/hero-v2/controlled-rig-sample-v1/native"))
    if args.style:
        command.append("--style-source=" + str(ROOT / "art_source/linshui-quality/v1/characters/hero-v2/style-gate-v2/native"))
        command.append("--style-capture=" + str(EVIDENCE))
    if args.character2d:
        command.append("--character-2d-source=" + str(ROOT / "art_source/linshui-quality/v1/characters/hero-v2/2d-static-gate-v1/native"))
        command.append("--style-capture=" + str(EVIDENCE))
    if args.character2d256:
        command.append("--character-2d-source=" + str(ROOT / "art_source/linshui-quality/v1/characters/hero-v2/2d-png-256-v1"))
        command.append("--style-capture=" + str(EVIDENCE))
    if args.character2d_motion:
        command.append("--character-2d-source=" + str(ROOT / "art_source/linshui-quality/v1/characters/hero-v2/2d-motion-review-v1"))
        command.append("--motion-2d-capture=" + str(EVIDENCE))
    if args.character2d_batch:
        command.append("--character-2d-source=" + str(ROOT / "art_source/linshui-quality/v1/characters/hero-v2/2d-batch-v1"))
        command.append("--motion-2d-capture=" + str(EVIDENCE))
    start = time.time()
    process = subprocess.run(command, cwd=ROOT, env=env, capture_output=True,
                             encoding="utf-8", errors="replace", timeout=180)
    screenshot = EVIDENCE / (f"{prefix}-s-walk-01-{args.height}.png" if args.character2d_batch else (f"{prefix}-walk-01-{args.height}.png" if args.character2d_motion else (f"{prefix}-s-{args.height}.png" if args.style or args.character2d or args.character2d256 else f"{prefix}-overview-{args.height}.png")))
    suffix = "-routes" if args.routes else ""
    engine_report = EVIDENCE / f"{prefix}-report-{args.height}{suffix}.json"
    fresh = all(p.exists() and p.stat().st_mtime >= start for p in [screenshot, engine_report])
    errors = [line for line in (process.stdout + process.stderr).splitlines()
              if "SCRIPT ERROR" in line or "Parse Error" in line]
    details = json.loads(engine_report.read_text(encoding="utf-8")) if fresh else {}
    if args.character2d_motion or args.character2d_batch:
        frames = details.get("frames", [])
        expected_walk = 8 if args.character2d_batch else 5
        expected_thrust = 12 if args.character2d_batch else 1
        evidence_pass = (details.get("renderer") == "forward_plus" and
                         details.get("candidate_walk_frames") == expected_walk and
                         details.get("candidate_thrust_frames") == expected_thrust and
                         details.get("required_walk_frames") == 8 and
                         len(frames) == expected_walk + (expected_thrust if args.character2d_batch else 0) and
                         all(frame.get("saved") and
                                                  frame.get("actual_frame") == frame.get("index") - 1 for frame in frames) and
                         {frame.get("sequence") for frame in frames} == ({"s-walk", "se-thrust"} if args.character2d_batch else {"s-walk"}) and
                         len({frame.get("actor_position") for frame in frames}) == 1 and
                         len({frame.get("pixel_size") for frame in frames}) == 1 and
                         len({frame.get("offset") for frame in frames}) == 1 and
                         len({frame.get("sprite_scale") for frame in frames}) == 1)
        expected_playback = {"s-walk": list(range(expected_walk))}
        if args.character2d_batch:
            expected_playback["se-thrust"] = list(range(12))
        evidence_pass = evidence_pass and details.get("playback_observed") == expected_playback
        if args.character2d_batch:
            evidence_pass = evidence_pass and details.get("attack_input") == {
                "started": True, "locked": True,
                "repeat_did_not_restart": True, "unlocked": True}
    elif args.style or args.character2d or args.character2d256:
        evidence_pass = (details.get("renderer") == "forward_plus" and
                         {frame.get("direction") for frame in details.get("frames", [])} == {"s", "se"} and
                         all(frame.get("saved") for frame in details.get("frames", [])) and
                         len({frame.get("actor_position") for frame in details.get("frames", [])}) == 1 and
                         len({frame.get("pixel_size") for frame in details.get("frames", [])}) == 1 and
                         len({frame.get("offset") for frame in details.get("frames", [])}) == 1)
        if args.character2d or args.character2d256:
            expected_offset = "(0.0, 92.0)" if args.character2d256 else "(0.0, 48.0)"
            evidence_pass = (evidence_pass and
                             all(frame.get("node_type") == "AnimatedSprite3D" and
                                 frame.get("offset") == expected_offset for frame in details.get("frames", [])))
    else:
        evidence_pass = not details.get("failures", ["missing report"])
    if args.character2d_motion:
        fresh = fresh and all((EVIDENCE / f"{prefix}-walk-{n:02}-{args.height}.png").exists() and
                              (EVIDENCE / f"{prefix}-walk-{n:02}-{args.height}.png").stat().st_mtime >= start
                              for n in range(1, 6))
    if args.character2d_batch:
        fresh = fresh and all((EVIDENCE / f"{prefix}-{sequence}-{n:02}-{args.height}.png").exists() and
                              (EVIDENCE / f"{prefix}-{sequence}-{n:02}-{args.height}.png").stat().st_mtime >= start
                              for sequence, count in [("s-walk", 8), ("se-thrust", 12)] for n in range(1, count + 1))
    if args.style or args.character2d or args.character2d256:
        second = EVIDENCE / f"{prefix}-se-{args.height}.png"
        fresh = fresh and second.exists() and second.stat().st_mtime >= start
    result = {"command": command, "exit_code": process.returncode, "fresh_evidence": fresh,
              "script_errors": errors, "route_test_requested": args.routes,
              "structural_pass": process.returncode == 0 and fresh and not errors and evidence_pass,
              "visual_approved": False, "approval_required": "P2 art/motion remains unapproved; P1 composition was approved by user on 2026-09-24."}
    (REPORT / f"{prefix}-{args.height}{suffix}-capture.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(process.stdout)
    print(process.stderr)
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["structural_pass"] else 1)


if __name__ == "__main__":
    main()
