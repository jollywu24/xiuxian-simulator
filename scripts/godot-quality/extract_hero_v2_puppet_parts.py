"""Mechanically extract separated, AI-drawn puppet islands; no new painting.

Input: two generated transparent parts sheets. Output: source PNG cutouts,
placement metadata, and a deterministic rest-pose review composite. This is
pre-production art assembly, not a runtime atlas or a visual quality pass.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
OUT = SOURCE / "puppet-parts"
OUT.mkdir(exist_ok=True)
REGIONS = {
    "head": ((40, 75, 510, 585), (405, -335)),
    "torso": ((500, 95, 930, 655), (0, 0)),
    "skirt": ((500, 95, 930, 655), (0, 0)),
    "arm_r": ((930, 180, 1145, 605), (-400, -25)),
    "arm_l": ((1160, 180, 1350, 605), (-380, -25)),
    "leg_r": ((210, 675, 435, 1045), (360, -90)),
    "leg_l": ((635, 675, 870, 1045), (80, -90)),
    "sword": ((1055, 585, 1170, 1075), (-520, -140)),
}
LAYERS = ("leg_r", "leg_l", "skirt", "torso", "arm_l", "arm_r", "head", "sword")

index = {"canvas": [1200, 1320], "virtual_origin_y": 350,
         "virtual_foot_y": 942, "virtual_center_x": 700,
         "layer_order_back_to_front": list(LAYERS), "directions": {}}
for direction in ("s", "se"):
    sheet = Image.open(SOURCE / f"puppet-parts-{direction}-v1.png").convert("RGBA")
    preview = Image.new("RGBA", (1200, 1320))
    parts = {}
    for name, (crop_box, offset) in REGIONS.items():
        cut = sheet.crop(crop_box)
        # Alpha below 8 is diffuse generation noise, not meaningful art.
        alpha = cut.getchannel("A").point(lambda value: 0 if value < 8 else value)
        if name in ("torso", "skirt"):
            # The generated body includes redundant outer sleeves. Remove only
            # their two large lobes; independently drawn arm parts cover seams.
            mask = Image.new("L", cut.size, 0)
            draw = ImageDraw.Draw(mask)
            draw.polygon([(118, 0), (288, 0), (335, 60), (326, 185),
                          (305, 245), (424, 555), (5, 555),
                          (125, 245), (106, 185), (55, 60)], fill=255)
            from PIL import ImageChops
            alpha = ImageChops.multiply(alpha, mask)
            if name == "torso":
                alpha.paste(0, (0, 255, cut.width, cut.height))
            else:
                alpha.paste(0, (0, 0, cut.width, 225))
        cut.putalpha(alpha)
        path = OUT / f"{direction}-{name}.png"
        cut.save(path)
        parts[name] = {"file": str(path.relative_to(SOURCE)).replace("\\", "/"),
                       "crop_box": list(crop_box), "virtual_offset": list(offset)}
    for name in LAYERS:
        part = Image.open(SOURCE / parts[name]["file"])
        crop_box = parts[name]["crop_box"]
        ox, oy = parts[name]["virtual_offset"]
        preview.alpha_composite(part, (crop_box[0] + ox, crop_box[1] + oy + 350))
    preview.save(SOURCE / f"puppet-rest-preview-{direction}.png")
    index["directions"][direction] = parts

(OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote 16 real parts and two assembled rest-pose reviews to {SOURCE}")
