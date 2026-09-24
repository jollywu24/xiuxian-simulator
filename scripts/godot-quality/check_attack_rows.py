"""Check uploaded attack row slicing against transparent source gutters."""
import json
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[2]
source=root/'godot/linshui-quality/assets/characters/hero/character5.png'
alpha=Image.open(source).getchannel('A')
starts=[0,180,370,560,750,940,1135]
height=190
rows=[]
for i,start in enumerate(starts):
    mask=alpha.crop((0,start,alpha.width,start+height)).point(lambda value:255 if value>170 else 0)
    bbox=mask.getbbox()
    rows.append({'row':i,'slice':[start,start+height],'opaque_bbox':bbox,'top_margin':bbox[1] if bbox else None,'bottom_margin':height-bbox[3] if bbox else None})
good=all(row['opaque_bbox'] and row['top_margin']>=1 and row['bottom_margin']>=5 for row in rows)
report={'source':source.relative_to(root).as_posix(),'row_separation_pass':good,'row_count':len(rows),'rows':rows,'horizontal_weapon_overlap_still_open':True,'original_upload_modified':False}
(root/'docs/godot-quality/reports/attack-row-separation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'row_separation_pass':good,'margins':[(row['top_margin'],row['bottom_margin']) for row in rows]}))
raise SystemExit(0 if good else 1)
