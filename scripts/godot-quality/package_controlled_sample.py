"""Uniform 4:1 sampling of full renders, no bounding-box alignment or retiming."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'art_source/linshui-quality/v1/characters/hero-v2/controlled-rig-sample-v1'
OUT=SOURCE/'native'
OUT.mkdir(exist_ok=True)
report=[]
for direction,action,count in [('s','idle',1),('se','idle',1),('s','walk',8),('se','thrust',12)]:
    frames=[]
    sheet=Image.new('RGBA',(160*count,128))
    for n in range(1,count+1):
        path=SOURCE/f'{direction}-controlled_{action}-{n:02}.png'
        with Image.open(path) as im:
            assert im.size==(640,512)
            frame=im.convert('RGBA').resize((160,128),Image.Resampling.LANCZOS)
        frame.putalpha(frame.getchannel('A').point(lambda a:255 if a>=128 else 0))
        bbox=frame.getbbox()
        safe=bool(bbox and bbox[0]>=4 and bbox[1]>=4 and bbox[2]<=156 and bbox[3]<=124)
        report.append(dict(source=str(path.relative_to(ROOT)),bbox=bbox,safe=safe))
        frame.save(OUT/f'{direction}-{action}-{n:02}.png')
        sheet.alpha_composite(frame,((n-1)*160,0))
        backdrop=Image.new('RGBA',(160,128),(137,151,155,255))
        backdrop.alpha_composite(frame)
        frames.append(backdrop.convert('RGB'))
    sheet.save(OUT/f'{direction}-{action}-atlas.png')
    if count>1:
        frames[0].save(OUT/f'{direction}-{action}.gif',save_all=True,append_images=frames[1:],
                       duration=125 if action=='walk' else 83,loop=0)
    # A clearly labelled contact sheet, not a substitute for engine evidence.
    contact=Image.new('RGB',(160*4,152*((count+3)//4)),(137,151,155))
    draw=ImageDraw.Draw(contact)
    for i,frame in enumerate(frames):
        x=(i%4)*160; y=(i//4)*152
        contact.paste(frame,(x,y))
        draw.text((x+6,y+130),f'{direction} {action} {i+1}',fill='white')
    contact.save(OUT/f'{direction}-{action}-contact.png')
(SOURCE/'sampling-check.json').write_text(json.dumps(dict(
    status='technical_sample_only_not_visual_acceptance',canvas=[160,128],
    uniform_scale=.25,translation=[0,0],root_anchor=[80,112],
    safe_margin_pass=all(f['safe'] for f in report),frames=report),indent=2),encoding='utf-8')
print(json.dumps(dict(frames=len(report),safe_margin_pass=all(f['safe'] for f in report))))
