"""Record only files that exist and actual gate outcomes. Never bulk-approve assets."""
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1';OUT=ROOT/'godot/linshui-quality/assets'
p=SRC/'asset-manifest.json';manifest=json.loads(p.read_text(encoding='utf-8'))
if manifest.get('document_id') != 'wudao-godot-one-screen-quality-v1':
    raise SystemExit('Legacy v1 sync disabled for the v2 replan; it would restore obsolete 336-frame/rig constraints and overwrite current evidence.')
mapping={
'REF-00':('source_ready',[ROOT/'docs/godot-quality/references/hd2d-town-target.jpg']),
'REF-02':('source_ready',[SRC/'references/hero-guide-v1.png']),
'REF-03':('source_ready',[SRC/'references/tea-guide-v1.png']),
'CHR-01':('rejected',[SRC/'characters/hero/hero-v1.blend',SRC/'characters/hero/render-profile.json',SRC/'characters/hero/pixel-patches.json',SRC/'characters/hero/weapon-anchors.json',SRC/'characters/hero/p2-contact-sheet.png',*sorted((OUT/'characters/hero').glob('*.png')),OUT/'characters/hero/atlas.json']),
'ENV-01':('integrated',[SRC/'environment/tea-house/tea-house-v1.blend',*sorted((OUT/'environment').glob('tea-*-v1.glb'))]),
'ENV-03':('integrated',[SRC/'environment/pavement/pavement-v1.blend',OUT/'environment/pavement-1-v1.glb']),
'TX-01':('exported',[SRC/'textures/plaster-albedo-source-v1.png',*sorted((OUT/'textures').glob('plaster-*-v1.png'))]),
'TX-02':('exported',[SRC/'textures/wood-albedo-source-v1.png',*sorted((OUT/'textures').glob('wood-*-v1.png'))]),
'TX-04':('rejected',[SRC/'textures/stone-albedo-source-v1.png',*sorted((OUT/'textures').glob('stone-*-v1.png'))])}
for a in manifest['assets']:
    if a['id'] not in mapping:continue
    status,files=mapping[a['id']];a['status']=status
    a['actual_outputs']=[{'path':f.relative_to(ROOT).as_posix(),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in files]
    a['stage_evidence']['p2']={'state':'partial_not_accepted','review':'docs/godot-quality/review/p2-review.json'}
    a['approved_by']=None
    a['notes']={'REF-02':'Hero guide only; vendor guide and full REF-02 remain incomplete.','REF-03':'Tea shop guide only; bridge guide incomplete.','ENV-03':'One 2m module instanced four times for 4m fixture; 4 distinct variants and curb incomplete.','CHR-01':'48/336 slots from same rig; r4 after user feedback, lossless import and palette fix, still visually rejected.'}.get(a['id'],'Exists and recorded; not a visual pass. See P2 defects.')
manifest['state']='p2_review_blocked';p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
lock=json.loads((SRC/'toolchain-lock.json').read_text());lock['image_generation']['actual_call_verified']=True
lock['image_generation']['successful_calls']=5;lock['graphics']['forward_plus_verified']=True
lock['graphics']['evidence']='docs/godot-quality/reports/p2-engine.log';lock['screen_capture']['engine_viewport_pending']=False
(SRC/'toolchain-lock.json').write_text(json.dumps(lock,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'assets':len(manifest['assets']),'with_actual_outputs':len(mapping),'reviewed_pass':0},ensure_ascii=False))
