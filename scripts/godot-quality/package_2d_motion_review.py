"""Package only existing complete 2D drawings for a deliberately incomplete motion review.

No missing frame is synthesized, repeated, mirrored, aligned by bbox, or resized.
"""
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2/review-normalized"
DEST = ROOT / "art_source/linshui-quality/v1/characters/hero-v2/2d-motion-review-v1"
FRAMES = DEST / "frames"
FRAMES.mkdir(parents=True, exist_ok=True)
CANVAS = (256, 256)
PIVOT = (128, 220)
SHIFT = (48, 108)
SEQUENCES = {"s-idle": 4, "se-idle": 4, "s-walk": 5, "se-thrust": 1}
EXPECTED = {"s-idle": 4, "se-idle": 4, "s-walk": 8, "se-thrust": 12}

entries = []
for sequence, count in SEQUENCES.items():
    direction, action = sequence.split("-")
    for index in range(1, count + 1):
        source_index = 7 if sequence == "se-thrust" else index
        src = SOURCE / direction / action / f"{source_index:02}.png"
        with Image.open(src) as image:
            if image.size != (160, 128):
                raise ValueError(f"Unexpected source canvas: {src}: {image.size}")
            frame = image.convert("RGBA")
        padded = Image.new("RGBA", CANVAS)
        padded.alpha_composite(frame, SHIFT)
        bbox = padded.getchannel("A").point(lambda alpha: 255 if alpha >= 128 else 0).getbbox()
        safe = bool(bbox and bbox[0] >= 4 and bbox[1] >= 4 and bbox[2] <= 252 and bbox[3] <= 252)
        out = FRAMES / f"{sequence}-{index:03}.png"
        padded.save(out)
        entries.append({"sequence": sequence, "index": index, "source_index": source_index,
                        "source": src.relative_to(ROOT).as_posix(),
                        "output": out.relative_to(ROOT).as_posix(),
                        "alpha_bbox": bbox, "safe": safe})

report = {"status": "incomplete_motion_review_not_p2_accepted",
          "format": "independent_complete_2d_png",
          "canvas": CANVAS, "foot_pivot": PIVOT,
          "fixed_translation": SHIFT, "per_frame_alignment": False,
          "sequences": SEQUENCES, "required_for_p2": EXPECTED,
          "missing": {key: EXPECTED[key] - SEQUENCES[key] for key in EXPECTED},
          "frames": entries, "all_safe": all(entry["safe"] for entry in entries),
          "limitations": ["S walk has only five drawn frames, not the required eight.",
                          "SE thrust contains only the seventh key pose, not an animation.",
                          "Existing S walk frames have not passed continuous motion review."]}
(DEST / "frame-contract.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"frames": len(entries), "missing": report["missing"], "all_safe": report["all_safe"]}))
if not report["all_safe"]:
    raise SystemExit(1)
