"""Create a 1:1 QA crop from three real 1080p Godot screenshots."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
EVIDENCE=ROOT/'docs/godot-quality/evidence'
sources=[
    ('Previous S',EVIDENCE/'p2-controlled-rig-overview-1080.png'),
    ('Style gate S',EVIDENCE/'p2-style-gate-v2-s-1080.png'),
    ('Style gate SE',EVIDENCE/'p2-style-gate-v2-se-1080.png'),
]
width,height=260,230
canvas=Image.new('RGB',(width*len(sources),height+30),(35,40,45))
draw=ImageDraw.Draw(canvas)
for i,(label,path) in enumerate(sources):
    with Image.open(path) as im:
        if im.size!=(1920,1080):
            raise ValueError(f'Unexpected resolution: {path}')
        # The three captures share the frozen camera and actor world position.
        crop=im.convert('RGB').crop((630,455,630+width,455+height))
    canvas.paste(crop,(i*width,30))
    draw.text((i*width+8,10),label,fill=(240,240,240))
target=EVIDENCE/'style-gate-v2-before-after-1080.png'
canvas.save(target)
print(target)

two_d_sources=[
    ('3D trial',EVIDENCE/'p2-style-gate-v2-s-1080.png'),
    ('2D 160 cell',EVIDENCE/'p2-character-2d-v1-s-1080.png'),
    ('2D 256 cell',EVIDENCE/'p2-character-2d-256-v1-s-1080.png'),
]
canvas=Image.new('RGB',(width*len(two_d_sources),height+30),(35,40,45))
draw=ImageDraw.Draw(canvas)
for i,(label,path) in enumerate(two_d_sources):
    with Image.open(path) as im:
        if im.size!=(1920,1080):
            raise ValueError(f'Unexpected resolution: {path}')
        crop=im.convert('RGB').crop((630,455,630+width,455+height))
    canvas.paste(crop,(i*width,30))
    draw.text((i*width+8,10),label,fill=(240,240,240))
target=EVIDENCE/'character-2d-format-comparison-1080.png'
canvas.save(target)
print(target)
