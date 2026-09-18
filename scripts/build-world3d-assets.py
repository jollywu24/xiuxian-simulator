"""Export original material masters as bounded, browser-ready WebP textures."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
for source, output in [('stone-source-v1.png', 'temple-stone-v1.webp'), ('timber-source-v1.png', 'temple-timber-v1.webp')]:
    target = ROOT / 'web/assets/world3d' / output
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(ROOT / 'art_source/world3d/materials-v1' / source) as image:
        image.convert('RGB').resize((1024, 1024), Image.Resampling.LANCZOS).save(target, 'WEBP', quality=86, method=6)
    print(output, target.stat().st_size)
