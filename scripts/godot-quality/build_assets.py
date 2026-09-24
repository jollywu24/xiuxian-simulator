"""Incremental compilation only. Never calls generators or overwrites authored masters."""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1';OUT=ROOT/'godot/linshui-quality/assets'
LOCK=SRC/'toolchain-lock.json';CACHE=ROOT/'.tmp/godot-quality/build-cache.json'
def digest(paths):
    h=hashlib.sha256()
    for p in paths:
        if not p.is_file():raise FileNotFoundError(f'Required source absent: {p.relative_to(ROOT)}')
        h.update(p.read_bytes())
    return h.hexdigest()
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--stage',choices=['p2'],required=True);ap.add_argument('--changed',action='store_true');a=ap.parse_args()
    blender=json.loads(LOCK.read_text())['blender']['path'];cache=json.loads(CACHE.read_text()) if CACHE.exists() else {}
    jobs=[]
    master=SRC/'environment/tea-house/tea-house-v1.blend'
    for module in ['walls','roof','facade','foundation']:
        jobs.append((f'ENV-01:{module}',master,module,OUT/f'environment/tea-{module}-v1.glb'))
    jobs.append(('ENV-03:p2',SRC/'environment/pavement/pavement-v1.blend','pavement-1',OUT/'environment/pavement-1-v1.glb'))
    report=[]
    for asset,master,col,target in jobs:
        inputs=[master,ROOT/'scripts/godot-quality/export_glb.py']+list((OUT/'textures').glob('*albedo-v1.png'))
        sha=digest(inputs)
        if a.changed and cache.get(asset)==sha and target.exists():report.append({'id':asset,'result':'unchanged'});continue
        cmd=[blender,'--background','--factory-startup','--python',str(ROOT/'scripts/godot-quality/export_glb.py'),'--',str(master),col,str(target)]
        p=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True)
        if p.returncode or 'Traceback' in p.stdout+p.stderr:raise RuntimeError(p.stdout+p.stderr)
        cache[asset]=sha;report.append({'id':asset,'result':'exported','input_sha256':sha})
    CACHE.parent.mkdir(parents=True,exist_ok=True);CACHE.write_text(json.dumps(cache,indent=2))
    (ROOT/'docs/godot-quality/reports/build-p2.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
