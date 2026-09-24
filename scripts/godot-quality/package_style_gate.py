"""Sample the two static whole-body Blender renders with one frozen transform."""
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'art_source/linshui-quality/v1/characters/hero-v2/style-gate-v2'
NATIVE=SOURCE/'native'
NATIVE.mkdir(exist_ok=True)
results=[]
for direction in ('s','se'):
    with Image.open(SOURCE/f'{direction}-idle-source-01.png') as im:
        if im.size!=(640,512):
            raise ValueError(f'{direction}: expected one fixed 640x512 source frame')
        target=im.convert('RGBA').resize((160,128),Image.Resampling.LANCZOS)
    target.putalpha(target.getchannel('A').point(lambda a:255 if a>=128 else 0))
    box=target.getbbox()
    result={'direction':direction,'source':f'{direction}-idle-source-01.png',
            'target':f'native/{direction}-idle.png','bbox':box,
            'safe':bool(box and box[0]>=4 and box[1]>=4 and box[2]<=156 and box[3]<=124)}
    target.save(NATIVE/f'{direction}-idle.png')
    results.append(result)
report={'stage':'static_style_gate','visual_approved':False,
        'canvas':[160,128],'root_anchor':[80,112],
        'fixed_source_size':[640,512],'scale':.25,'translation':[0,0],
        'all_safe':all(r['safe'] for r in results),'frames':results}
(SOURCE/'sampling-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
if not report['all_safe']:
    raise SystemExit(1)
