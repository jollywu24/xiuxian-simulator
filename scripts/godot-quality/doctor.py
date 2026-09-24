"""Record observed tool capabilities; never infer visual/performance success."""
import argparse, importlib.util, json, os, shutil, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

def run(cmd):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return {'exit_code':p.returncode,'output':(p.stdout+p.stderr).strip()}
    except Exception as e:
        return {'exit_code':None,'error':str(e)}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--godot',default=os.environ.get('GODOT_BIN') or shutil.which('godot'))
    ap.add_argument('--blender',default=os.environ.get('BLENDER_BIN') or shutil.which('blender'))
    ap.add_argument('--report',default='docs/godot-quality/reports/doctor.json')
    a=ap.parse_args()
    template_root=Path(os.environ.get('APPDATA',''))/'Godot/export_templates'
    report={'godot':{'path':a.godot,'probe':run([a.godot,'--version']) if a.godot else None,
                     'templates_found':[str(p) for p in template_root.glob('*/windows*')], 'templates_match':False},
            'blender':{'path':a.blender,'probe':run([a.blender,'--version']) if a.blender else None},
            'python':{'path':sys.executable,'version':sys.version,'pillow_available':importlib.util.find_spec('PIL') is not None},
            'image_generation':{'available_in_assistant':True,'method':'built-in image_gen','actual_call_verified':False,'new_paid_service_authorized':False},
            'graphics':{'probe':run(['nvidia-smi','--query-gpu=name,driver_version,memory.total','--format=csv,noheader']), 'forward_plus_verified':False},
            'screen_capture':{'engine_viewport_pending':True,'realtime_recorder':shutil.which('ffmpeg')},
            'reference_snapshot':{'baseline':'docs/godot-quality/reports/reference-baseline.json'}}
    out=ROOT/a.report;out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    lock=ROOT/'art_source/linshui-quality/v1/toolchain-lock.json';lock.parent.mkdir(parents=True,exist_ok=True)
    lock.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__': main()
