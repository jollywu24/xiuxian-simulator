"""Compile generated albedo and explicitly flat data channels, not inferred relief."""
from PIL import Image
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1/textures';OUT=ROOT/'godot/linshui-quality/assets/textures'
OUT.mkdir(parents=True,exist_ok=True)
for name,rough in [('wood',220),('stone',230),('plaster',240)]:
    source=SRC/f'{name}-albedo-source-v1.png'
    albedo=Image.open(source).convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS)
    albedo.save(OUT/f'{name}-albedo-v1.png')
    Image.new('RGB',(1024,1024),(128,128,255)).save(OUT/f'{name}-normal-v1.png')
    Image.new('RGB',(1024,1024),(255,rough,0)).save(OUT/f'{name}-orm-v1.png')
    tile=Image.new('RGB',(1536,1536));small=albedo.resize((512,512))
    for y in range(3):
        for x in range(3):tile.paste(small,(x*512,y*512))
    tile.save(SRC/f'{name}-tile-review.png')
    (SRC/f'{name}-material-rules.json').write_text(json.dumps({'source':str(source.relative_to(ROOT)),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'normal':'flat tangent normal; relief supplied by geometry, no color-to-height inference','orm':{'r':'AO=1, no baked AO','g':rough/255,'b':'metallic=0'},'color_space':{'albedo':'sRGB','normal':'linear','orm':'linear'},'seam_review':'pending'},indent=2))
print('Three albedo/normal/ORM sets compiled; seam inspection pending')
