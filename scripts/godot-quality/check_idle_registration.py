"""Measure fixed-grid registration without editing or recentering image frames."""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'godot/linshui-quality/assets/characters/hero/character2.png'
im=Image.open(source).getchannel('A')
results=[]
for row,direction in enumerate(['n','ne','e','se','s','sw','w','nw']):
    y0=int(row*im.height/8);y1=int((row+1)*im.height/8)
    def centers(corrected):
        values=[]
        for col in range(4):
            x0=40+col*199 if corrected else int(col*im.width/4)
            x1=x0+199 if corrected else int((col+1)*im.width/4)
            # Same lower-body measurement band; not used to transform any frame.
            crop=im.crop((x0,y0+int((y1-y0)*.65),x1,y0+int((y1-y0)*.9)))
            box=crop.point(lambda v:255 if v>160 else 0).getbbox()
            values.append((box[0]+box[2])/2)
        return values
    before=centers(False);after=centers(True)
    results.append({'direction':direction,'before_x':before,'after_x':after,'before_span_source_px':max(before)-min(before),'after_span_source_px':max(after)-min(after)})
report={'method':'lower-body alpha envelope inside fixed 65%-90% height band; diagnostic only, not a gait score','rows':results,'pass':all(r['after_span_source_px']<=3 for r in results),'original_image_modified':False}
(ROOT/'docs/godot-quality/reports/idle-registration.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2));raise SystemExit(0 if report['pass'] else 1)
