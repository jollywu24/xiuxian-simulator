"""Mechanical sheet extraction for diagnosis, not creative repainting or animation approval."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2/motion-samples"
OUT = ROOT / "godot/linshui-quality/assets/review"
path = SOURCE / "walk-s-sheet-v3.png"
image = Image.open(path).convert("RGBA")
if image.size != (1774,887):
    raise SystemExit(f"Source contract changed: {image.size}")
# One regular grid calibration across the sheet; never recenter individual opaque bounds.
rects = [(68 + col*416,row*443,416,443) for row in range(2) for col in range(4)]
frames = []
records = []
for index,(x,y,w,h) in enumerate(rects):
    source = image.crop((x,y,x+w,y+h))
    frame = Image.new("RGBA",(160,128))
    frame.alpha_composite(source.resize((83,89),Image.Resampling.LANCZOS),(38,26))
    frame.putalpha(frame.getchannel("A").point(lambda a:255 if a>=128 else 0))
    bounds = frame.getchannel("A").getbbox()
    if bounds is None or bounds[0]<4 or bounds[1]<4 or bounds[2]>156 or bounds[3]>124:
        raise SystemExit(f"Unsafe frame {index}: {bounds}")
    frames.append(frame)
    records.append({"frame":index,"source_rect":[x,y,w,h],"alpha_bbox":bounds})
atlas = Image.new("RGBA",(1280,128))
for index,frame in enumerate(frames):
    atlas.alpha_composite(frame,(index*160,0))
OUT.mkdir(parents=True,exist_ok=True)
atlas.save(OUT / "walk-s-motion-sample-v3.png")
# Native-size loop is a diagnostic artifact, never a replacement for engine footage.
frames[0].save(SOURCE / "walk-s-motion-sample-v3.gif",save_all=True,append_images=frames[1:],duration=125,loop=0,disposal=2)
record = {"status":"candidate_not_accepted","source":str(path.relative_to(ROOT)),"source_sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
          "method":"whole-sheet imagegen followed by fixed regular-grid crop/resample; not same-rig output",
          "frame_size":[160,128],"foot_anchor":[80,112],"fps":8,
          "fixed_transform":{"source_cell":[416,443],"resized":[83,89],"paste":[38,26]},"frames":records,
          "defects":["Passing poses remain insufficiently distinct from contact poses; cannot claim accepted gait.","Row-to-row foot and head registration differs; no per-frame runtime compensation is applied.","Eight-frame loop only; no SE/thrust/8-direction completion."]}
(SOURCE / "walk-s-motion-sample-v3.json").write_text(json.dumps(record,indent=2),encoding="utf-8")
print(json.dumps(record,indent=2))
