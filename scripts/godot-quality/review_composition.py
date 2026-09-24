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
    args = parser.parse_args()
    REPORT.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env["APPDATA"] = str(ROOT / ".tmp/godot-quality/profile")
    prefix = "p2-controlled-rig" if args.controlled else ("p2-refined" if args.p2 else "composition")
    scene = "composition-refined" if args.p2 or args.controlled else "composition-review"
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
    start = time.time()
    process = subprocess.run(command, cwd=ROOT, env=env, capture_output=True,
                             encoding="utf-8", errors="replace", timeout=180)
    screenshot = EVIDENCE / f"{prefix}-overview-{args.height}.png"
    suffix = "-routes" if args.routes else ""
    engine_report = EVIDENCE / f"{prefix}-report-{args.height}{suffix}.json"
    fresh = all(p.exists() and p.stat().st_mtime >= start for p in [screenshot, engine_report])
    errors = [line for line in (process.stdout + process.stderr).splitlines()
              if "SCRIPT ERROR" in line or "Parse Error" in line]
    details = json.loads(engine_report.read_text(encoding="utf-8")) if fresh else {}
    result = {"command": command, "exit_code": process.returncode, "fresh_evidence": fresh,
              "script_errors": errors, "route_test_requested": args.routes,
              "structural_pass": process.returncode == 0 and fresh and not errors and not details.get("failures", ["missing report"]),
              "visual_approved": False, "approval_required": "P2 art/motion remains unapproved; P1 composition was approved by user on 2026-09-24."}
    (REPORT / f"{prefix}-{args.height}{suffix}-capture.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(process.stdout)
    print(process.stderr)
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["structural_pass"] else 1)


if __name__ == "__main__":
    main()
