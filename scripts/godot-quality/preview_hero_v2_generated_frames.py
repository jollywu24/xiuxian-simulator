"""Make fixed-registration review frames from individually generated RGBA art.

One constant transform is used for every action/direction. This never centers
or rescales each frame's visible bounding box, which would reintroduce wobble.
Outputs are review candidates, not accepted atlases.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
GENERATED = SOURCE / "generated-frames"
OUT = SOURCE / "review-normalized"
OUT.mkdir(exist_ok=True)
SOURCE_SIZE = (1402, 1122)
FRAME_SIZE = (160, 128)
SCALE = 80 / 888
RESIZED = (round(SOURCE_SIZE[0] * SCALE), round(SOURCE_SIZE[1] * SCALE))
PASTE = (22, 18)
report = {"source_size": SOURCE_SIZE, "frame_size": FRAME_SIZE,
          "fixed_scale": SCALE, "fixed_resized_size": RESIZED,
          "fixed_paste": PASTE, "frames": {}}
for direction in ("s", "se"):
    for action, expected_count in (("idle", 4), ("walk", 8), ("thrust", 12)):
        frames = []
        for frame in range(1, expected_count + 1):
            src = GENERATED / direction / action / f"{frame:02}.png"
            if not src.exists():
                continue
            image = Image.open(src).convert("RGBA")
            if image.size != SOURCE_SIZE:
                raise ValueError(f"Wrong generated canvas: {src}: {image.size}")
            canvas = Image.new("RGBA", FRAME_SIZE)
            canvas.alpha_composite(image.resize(RESIZED, Image.Resampling.LANCZOS), PASTE)
            dest = OUT / direction / action / f"{frame:02}.png"
            dest.parent.mkdir(parents=True, exist_ok=True)
            canvas.save(dest)
            bbox = canvas.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
            frames.append((frame, canvas, bbox))
            report["frames"][f"{direction}/{action}/{frame:02}"] = {"bbox": bbox,
                                                                     "source": str(src.relative_to(SOURCE))}
        if frames:
            sheet = Image.new("RGBA", (FRAME_SIZE[0] * len(frames), FRAME_SIZE[1]))
            for column, (_, image, _) in enumerate(frames):
                sheet.alpha_composite(image, (column * FRAME_SIZE[0], 0))
            sheet.save(OUT / f"contact-{direction}-{action}.png")
(OUT / "metrics.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Prepared {len(report['frames'])} fixed-registration review frames")
