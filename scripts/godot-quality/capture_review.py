"""Launch real windowed Forward+ fixture and collect engine-written evidence, not repaint it."""
import argparse,json,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
ap=argparse.ArgumentParser();ap.add_argument('--stage',choices=['p1','p2'],default='p2');a=ap.parse_args()
lock=json.loads((ROOT/'art_source/linshui-quality/v1/toolchain-lock.json').read_text())
scene='res://scenes/validation/graybox.tscn' if a.stage=='p1' else 'res://scenes/main.tscn'
evidence=ROOT/'docs/godot-quality/evidence';report=ROOT/'docs/godot-quality/reports'
cmd=[lock['godot']['path'],'--path',str(ROOT/'godot/linshui-quality'),scene,'--resolution','1920x1080','--log-file',str(report/(a.stage+'-engine.log')),'--','--evidence='+str(evidence)]
start=time.time();p=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=180)
image=evidence/('p1-graybox.png' if a.stage=='p1' else 'default-entry-new-hero.png')
fresh=image.exists() and image.stat().st_mtime>=start
result={'command':cmd,'exit_code':p.returncode,'fresh_engine_screenshot':fresh,'screenshot':str(image.relative_to(ROOT)),'visual_pass':False,'note':'Capture success is not visual acceptance. No offline Movie Maker was used.'}
(report/(a.stage+'-capture.json')).write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
raise SystemExit(0 if p.returncode==0 and fresh else 1)
