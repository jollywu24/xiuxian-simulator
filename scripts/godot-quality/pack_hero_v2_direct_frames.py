"""Compile individually painted P2 frames only when every required file exists.

No fallback to puppet layers, rejected variants, low-poly source renders or the
old uploaded sheet. All 48 painted frames share one fixed canvas transform.
This emits a review candidate; G2 still requires human/engine acceptance.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
GENERATED = SOURCE / "generated-frames"
OUT = ROOT / "godot/linshui-quality/assets/characters/hero-v2"
PATCH_FILE = SOURCE / "direct-frame-pixel-patches.json"
DIRECTIONS = ("s", "se")
ACTIONS = {"idle": (4, 6), "walk": (8, 8), "thrust": (12, 12)}
SOURCE_SIZE = (1402, 1122)
FRAME_SIZE = (160, 128)
SCALE = 80 / 888
RESIZED = (round(SOURCE_SIZE[0] * SCALE), round(SOURCE_SIZE[1] * SCALE))
PASTE = (22, 18)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


required = [GENERATED / direction / action / f"{number:02}.png"
            for action, (count, _) in ACTIONS.items()
            for direction in DIRECTIONS for number in range(1, count + 1)]
missing = [str(path.relative_to(SOURCE)) for path in required if not path.is_file()]
if missing:
    raise SystemExit(json.dumps({"status": "blocked_missing_individual_art",
                                 "missing_count": len(missing), "missing": missing}, indent=2))
patches = json.loads(PATCH_FILE.read_text(encoding="utf-8"))
if patches.get("version") != 2:
    raise SystemExit("Expected v2 per-frame pixel patch ledger")

raw = {}
samples = []
for path in required:
    image = Image.open(path).convert("RGBA")
    if image.size != SOURCE_SIZE:
        raise SystemExit(f"Wrong frame canvas {path}: {image.size}")
    frame = Image.new("RGBA", FRAME_SIZE)
    frame.alpha_composite(image.resize(RESIZED, Image.Resampling.LANCZOS), PASTE)
    alpha = frame.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    bbox = alpha.getbbox()
    if bbox is None or bbox[0] < 4 or bbox[1] < 4 or bbox[2] > 156 or bbox[3] > 124:
        raise SystemExit(f"Frame crosses safe 4px margin: {path}: {bbox}")
    frame.putalpha(alpha)
    key = (path.parent.parent.name, path.parent.name, int(path.stem))
    raw[key] = (frame, path)
    samples.extend((r, g, b) for r, g, b, a in frame.getdata() if a >= 128)

# One shared palette is chosen for all 48 frames; transparent padding does not
# consume color slots. Color count is a target, not evidence of cluster quality.
strip = Image.new("RGB", (len(samples), 1))
strip.putdata(samples)
palette_colors = 48
palette = strip.quantize(colors=palette_colors, method=Image.Quantize.MEDIANCUT).getpalette()
palette_image = Image.new("P", (1, 1))
palette_image.putpalette(palette)

compiled = {}
for key, (frame, path) in raw.items():
    alpha = frame.getchannel("A")
    out = frame.convert("RGB").quantize(palette=palette_image,
                                         dither=Image.Dither.NONE).convert("RGBA")
    out.putalpha(alpha)
    for patch in patches.get("patches", []):
        if (patch["direction"], patch["action"], patch["frame"]) != key:
            continue
        for x, y, r, g, b, a in patch["pixels"]:
            if not (0 <= x < 160 and 0 <= y < 128 and a in (0, 255)):
                raise SystemExit(f"Invalid pixel patch in {PATCH_FILE}")
            out.putpixel((x, y), (r, g, b, a))
    compiled[key] = out

OUT.mkdir(parents=True, exist_ok=True)
metadata = {"version": 2, "stage": "P2", "status": "candidate_not_g2_pass",
            "source_master": "art_source/linshui-quality/v1/characters/hero-v2/hero-v2.blend",
            "source_provenance": "one-rig pose reference plus individual imagegen redraw and pixel-ledger",
            "frame_size": list(FRAME_SIZE), "foot_anchor": [80, 112],
            "fixed_transform": {"source_size": list(SOURCE_SIZE), "scale": SCALE,
                                "resized": list(RESIZED), "paste": list(PASTE)},
            "directions": list(DIRECTIONS), "missing_directions": ["n", "ne", "e", "sw", "w", "nw"],
            "palette_colors": palette_colors, "animations": {}}
for action, (count, fps) in ACTIONS.items():
    atlas = Image.new("RGBA", (count * 160, 2 * 128))
    entries = []
    for row, direction in enumerate(DIRECTIONS):
        for column in range(1, count + 1):
            key = (direction, action, column)
            frame = compiled[key]
            atlas.alpha_composite(frame, ((column - 1) * 160, row * 128))
            source_path = raw[key][1]
            event = None
            if action == "walk" and column in (1, 5):
                event = "left_contact" if column == 1 else "right_contact"
            if action == "thrust":
                event = ("windup" if column <= 3 else "extend" if column <= 5 else
                         "hit" if column <= 7 else "recover")
            entries.append({"direction": direction, "frame": column,
                            "rect": [(column - 1) * 160, row * 128, 160, 128],
                            "duration_seconds": 1 / fps, "foot_anchor": [80, 112],
                            "event": event, "weapon_hand": "right",
                            "weapon_tip": None,  # must be individually reviewed, never guessed
                            "alpha_bbox": frame.getchannel("A").getbbox(),
                            "source_sha256": sha(source_path),
                            "compiled_sha256": hashlib.sha256(frame.tobytes()).hexdigest()})
    atlas.save(OUT / f"{action}-p2-v2.png")
    metadata["animations"][action] = {"frames_per_direction": count, "fps": fps,
                                      "loop": action != "thrust", "frames": entries}
(OUT / "atlas-v2.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote 48 individually painted P2 slots to {OUT}; G2 remains pending")
