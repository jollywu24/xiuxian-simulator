"""Fixed-transform packaging for the first *unapproved* complete-2D action batch.

This only resamples whole drawings and pads them to independent PNG cells. It
does not align individual alpha bounds, scale individual poses, or compose parts.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
HERO = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
BATCH = HERO / "2d-batch-v1"
FRAMES = BATCH / "frames"
FRAMES.mkdir(parents=True, exist_ok=True)
SOURCE_CANVAS = (1402, 1122)
FRAME_CANVAS = (256, 256)
RESIZED = (126, 101)
PASTE = (70, 126)
PIVOT = (128, 220)


def package(sequence, count, source_dir):
    entries = []
    for index in range(1, count + 1):
        src = source_dir / f"{index:02}.png"
        revision = BATCH / "revisions" / sequence.replace("-", "/") / f"{index:02}-r2.png"
        if revision.exists():
            src = revision
        with Image.open(src) as opened:
            image = opened.convert("RGBA")
        original_size = image.size
        if original_size != SOURCE_CANVAS:
            if original_size != (1401, 1123) or sequence != "s-walk" or index != 7:
                raise ValueError(f"Unexpected source size: {src}: {original_size}")
            # Image generation returned a one-pixel canvas variant; use the same
            # top-left registration, no art rescale or bbox-based repositioning.
            canonical = Image.new("RGBA", SOURCE_CANVAS)
            canonical.alpha_composite(image, (0, 0))
            image = canonical
        cell = Image.new("RGBA", FRAME_CANVAS)
        cell.alpha_composite(image.resize(RESIZED, Image.Resampling.LANCZOS), PASTE)
        bbox = cell.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
        safe = bool(bbox and bbox[0] >= 4 and bbox[1] >= 4 and bbox[2] <= 252 and bbox[3] <= 252)
        dest = FRAMES / f"{sequence}-{index:03}.png"
        cell.save(dest)
        entries.append({"sequence": sequence, "frame": index,
                        "source": src.relative_to(ROOT).as_posix(),
                        "source_canvas": list(original_size),
                        "source_sha256": hashlib.sha256(src.read_bytes()).hexdigest(),
                        "output": dest.relative_to(ROOT).as_posix(),
                        "alpha_bbox": bbox, "safe": safe})
    return entries


entries = []
for sequence, count, directory in [
    ("s-idle", 4, HERO / "review-normalized/s/idle"),
    ("se-idle", 4, HERO / "review-normalized/se/idle"),
    ("s-walk", 8, BATCH / "source/s/walk"),
    ("se-thrust", 12, BATCH / "source/se/thrust"),
]:
    if sequence.endswith("idle"):
        # Already uniformly sampled 160x128; just use the common fixed padding.
        for index in range(1, count + 1):
            src = directory / f"{index:02}.png"
            with Image.open(src) as opened:
                image = opened.convert("RGBA")
            if image.size != (160, 128):
                raise ValueError(f"Wrong idle canvas: {src}: {image.size}")
            cell = Image.new("RGBA", FRAME_CANVAS)
            cell.alpha_composite(image, (48, 108))
            bbox = cell.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
            dest = FRAMES / f"{sequence}-{index:03}.png"
            cell.save(dest)
            entries.append({"sequence": sequence, "frame": index,
                            "source": src.relative_to(ROOT).as_posix(),
                            "source_sha256": hashlib.sha256(src.read_bytes()).hexdigest(),
                            "output": dest.relative_to(ROOT).as_posix(),
                            "alpha_bbox": bbox, "safe": bool(bbox and bbox[0] >= 4 and bbox[1] >= 4 and bbox[2] <= 252 and bbox[3] <= 252)})
    else:
        entries.extend(package(sequence, count, directory))

report = {"status": "complete_s_walk_and_se_thrust_batch_candidate_not_art_accepted",
          "production": "whole 2D images; built-in image_gen; one source drawing per action frame except SE thrust 07 reused from prior generated key",
          "canvas": FRAME_CANVAS, "foot_pivot": PIVOT,
          "source_canvas": SOURCE_CANVAS, "uniform_resized_size": RESIZED,
          "fixed_paste": PASTE, "per_frame_bbox_alignment": False,
          "sequences": {"s-idle": 4, "se-idle": 4, "s-walk": 8, "se-thrust": 12},
          "required_for_p2": {"s-idle": 4, "se-idle": 4, "s-walk": 8,
                              "se-walk": 8, "s-thrust": 12, "se-thrust": 12},
          "frames": entries, "all_safe": all(entry["safe"] for entry in entries),
          "limitations": ["Candidate art has not passed actual-size motion/identity review.",
                          "S thrust and SE walk are still absent; P2 48 slots are incomplete.",
                          "All action source PNGs must be reviewed frame-by-frame; no published game asset is replaced."]}
(BATCH / "frame-contract.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"frames": len(entries), "all_safe": report["all_safe"],
                  "sequences": report["sequences"]}))
if not report["all_safe"]:
    raise SystemExit(1)
