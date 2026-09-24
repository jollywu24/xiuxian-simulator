"""Sequential child-process waits and persisted logs; quality failures remain failures."""
import subprocess,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];REPORT=ROOT/'docs/godot-quality/reports';PROJECT=ROOT/'godot/linshui-quality'
lock=json.loads((ROOT/'art_source/linshui-quality/v1/toolchain-lock.json').read_text());godot=lock['godot']['path']
commands=[('godot-tests',[godot,'--headless','--path',str(PROJECT),'--script','res://tests/run_tests.gd']),('assets-p2',[sys.executable,str(ROOT/'scripts/godot-quality/validate_assets.py'),'--stage','p2']),('reference',[sys.executable,str(ROOT/'scripts/godot-quality/freeze_reference.py'),'--check'])]
commands.insert(1,('default-hero-contract',[godot,'--headless','--path',str(PROJECT),'--script','res://tests/test_uploaded_hero.gd']))
commands.insert(2,('upload-integrity',[sys.executable,str(ROOT/'scripts/godot-quality/check_uploaded_hero.py')]))
commands.insert(3,('idle-registration',[sys.executable,str(ROOT/'scripts/godot-quality/check_idle_registration.py')]))
commands.insert(4,('attack-row-separation',[sys.executable,str(ROOT/'scripts/godot-quality/check_attack_rows.py')]))
result=[]
for name,cmd in commands:
    try:
        p=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,timeout=45)
        output=p.stdout+p.stderr;code=p.returncode
    except subprocess.TimeoutExpired as e:
        output=str(e);code=124
    (REPORT/(name+'-run.log')).write_text(output,encoding='utf-8')
    has_errors='SCRIPT ERROR' in output or 'Parse Error' in output
    result.append({'check':name,'exit_code':code,'pass':code==0 and not has_errors,'log':str((REPORT/(name+'-run.log')).relative_to(ROOT))})
(REPORT/'quality-summary.json').write_text(json.dumps({'checks':result,'accepted_candidate':False,'reason':'Requires all visual and downstream gates, not only automation'},indent=2))
print(json.dumps(result,indent=2));raise SystemExit(0 if all(r['pass'] for r in result) else 1)
