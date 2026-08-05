from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


CANVAS = (1024, 1536)
ATLAS = (2048, 1664)
GRID_COLUMNS = 7
GRID_ROWS = 11
EYE_CROP = (384, 120, 640, 232)
SPINE_VERSION = "4.2.119"


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("image has no visible pixels")
    return bbox


def align_by_silhouette(source: Image.Image, target: Image.Image) -> Image.Image:
    source_box = alpha_bbox(source)
    target_box = alpha_bbox(target)
    scale_x = (target_box[2] - target_box[0]) / (source_box[2] - source_box[0])
    scale_y = (target_box[3] - target_box[1]) / (source_box[3] - source_box[1])
    resized = source.resize((round(source.width * scale_x), round(source.height * scale_y)), Image.Resampling.LANCZOS)
    resized_box = alpha_bbox(resized)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (target_box[0] - resized_box[0], target_box[1] - resized_box[1]))
    return canvas


def make_closed_eye_patch(body: str, target: Image.Image, generated: Image.Image) -> Image.Image:
    centers = {
        "male": ((467, 177), (555, 177)),
        "female": ((466, 177), (556, 177)),
    }[body]
    aligned = align_by_silhouette(generated, target)
    aligned_array = np.asarray(aligned, dtype=np.float32).copy()
    target_array = np.asarray(target, dtype=np.float32)
    coverage = Image.new("L", CANVAS, 0)
    coverage_draw = ImageDraw.Draw(coverage)
    for center_x, center_y in centers:
        coverage_draw.ellipse((center_x - 36, center_y - 17, center_x + 36, center_y + 19), fill=255)
    coverage = coverage.filter(ImageFilter.GaussianBlur(3.0))
    coverage_array = np.asarray(coverage, dtype=np.uint8)
    ring = (coverage_array > 12) & (coverage_array < 105) & (np.asarray(aligned.getchannel("A")) > 0)
    if np.count_nonzero(ring) > 100:
        source_median = np.median(aligned_array[ring, :3], axis=0)
        target_median = np.median(target_array[ring, :3], axis=0)
        aligned_array[..., :3] = np.clip(aligned_array[..., :3] + target_median - source_median, 0, 255)
    matched = Image.fromarray(aligned_array.astype(np.uint8), "RGBA")
    alpha = np.minimum(np.asarray(matched.getchannel("A"), dtype=np.uint16), coverage_array.astype(np.uint16)).astype(np.uint8)
    matched.putalpha(Image.fromarray(alpha, "L"))
    return matched.crop(EYE_CROP)


def pack_atlas(
    male: Image.Image,
    female: Image.Image,
    male_eyes: Image.Image,
    female_eyes: Image.Image,
    output: Path,
) -> None:
    atlas = Image.new("RGBA", ATLAS, (0, 0, 0, 0))
    atlas.alpha_composite(male, (0, 0))
    atlas.alpha_composite(female, (1024, 0))
    atlas.alpha_composite(male_eyes, (0, 1536))
    atlas.alpha_composite(female_eyes, (256, 1536))
    output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output, format="PNG", optimize=True)


def atlas_text(page_name: str) -> str:
    regions = [
        ("body_male", 0, 0, 1024, 1536),
        ("body_female", 1024, 0, 1024, 1536),
        ("eyes_male_closed", 0, 1536, 256, 112),
        ("eyes_female_closed", 256, 1536, 256, 112),
    ]
    lines = [
        page_name,
        f"size: {ATLAS[0]}, {ATLAS[1]}",
        "format: RGBA8888",
        "filter: Linear, Linear",
        "repeat: none",
        "pma: false",
    ]
    for name, x, y, width, height in regions:
        lines.extend([
            name,
            "  index: -1",
            "  rotate: false",
            f"  bounds: {x}, {y}, {width}, {height}",
            f"  offsets: 0, 0, {width}, {height}",
        ])
    return "\n".join(lines) + "\n"


def grid_vertices() -> list[tuple[float, float]]:
    xs = [(-CANVAS[0] / 2) + CANVAS[0] * index / (GRID_COLUMNS - 1) for index in range(GRID_COLUMNS)]
    ys = [CANVAS[1] * index / (GRID_ROWS - 1) for index in range(GRID_ROWS)]
    perimeter: list[tuple[int, int]] = []
    perimeter.extend((column, 0) for column in range(GRID_COLUMNS))
    perimeter.extend((GRID_COLUMNS - 1, row) for row in range(1, GRID_ROWS))
    perimeter.extend((column, GRID_ROWS - 1) for column in range(GRID_COLUMNS - 2, -1, -1))
    perimeter.extend((0, row) for row in range(GRID_ROWS - 2, 0, -1))
    interior = [
        (column, row)
        for row in range(1, GRID_ROWS - 1)
        for column in range(1, GRID_COLUMNS - 1)
    ]
    return [(xs[column], ys[row]) for column, row in perimeter + interior]


def vertex_index_map(vertices: list[tuple[float, float]]) -> dict[tuple[int, int], int]:
    xs = [(-CANVAS[0] / 2) + CANVAS[0] * index / (GRID_COLUMNS - 1) for index in range(GRID_COLUMNS)]
    ys = [CANVAS[1] * index / (GRID_ROWS - 1) for index in range(GRID_ROWS)]
    lookup = {(round(x, 5), round(y, 5)): index for index, (x, y) in enumerate(vertices)}
    return {
        (column, row): lookup[(round(xs[column], 5), round(ys[row], 5))]
        for row in range(GRID_ROWS)
        for column in range(GRID_COLUMNS)
    }


def mesh_attachment(path: str) -> dict:
    points = grid_vertices()
    index_map = vertex_index_map(points)
    triangles: list[int] = []
    for row in range(GRID_ROWS - 1):
        for column in range(GRID_COLUMNS - 1):
            bottom_left = index_map[(column, row)]
            bottom_right = index_map[(column + 1, row)]
            top_left = index_map[(column, row + 1)]
            top_right = index_map[(column + 1, row + 1)]
            triangles.extend((bottom_left, bottom_right, top_right, bottom_left, top_right, top_left))
    vertices = [coordinate for point in points for coordinate in point]
    uvs = [coordinate for x, y in points for coordinate in ((x + CANVAS[0] / 2) / CANVAS[0], 1 - y / CANVAS[1])]
    perimeter_count = 2 * GRID_COLUMNS + 2 * (GRID_ROWS - 2)
    return {
        "type": "mesh",
        "path": path,
        "uvs": [round(value, 6) for value in uvs],
        "triangles": triangles,
        "vertices": [round(value, 4) for value in vertices],
        "hull": perimeter_count,
        "width": CANVAS[0],
        "height": CANVAS[1],
    }


def deform_frame(time: float, breath: float, sway: float) -> dict:
    offsets: list[float] = []
    for x, y in grid_vertices():
        upper_weight = max(0.0, min(1.0, (y - 720) / 520))
        chest_weight = max(0.0, 1 - abs(y - 1110) / 360) * max(0.0, 1 - abs(x) / 430)
        hem_weight = max(0.0, 1 - abs(y - 760) / 300) * max(0.0, 1 - abs(x) / 370)
        delta_x = np.sign(x) * chest_weight * breath * 0.9 + hem_weight * sway * 5.0
        delta_y = upper_weight * breath * 2.4 + hem_weight * abs(sway) * 0.5
        offsets.extend((round(float(delta_x), 4), round(float(delta_y), 4)))
    return {
        "time": time,
        "vertices": offsets,
        "curve": [0.37, 0, 0.63, 1],
    }


def skeleton_data() -> dict:
    eye_center_y = CANVAS[1] - ((EYE_CROP[1] + EYE_CROP[3]) / 2)
    bones = [
        {"name": "root"},
        {"name": "pelvis", "parent": "root", "y": 650},
        {"name": "torso", "parent": "pelvis", "y": 360},
        {"name": "head", "parent": "torso", "y": 330},
        {"name": "hair-tip", "parent": "head", "y": 130},
        {"name": "hem-left", "parent": "pelvis", "x": -120, "y": 120},
        {"name": "hem-right", "parent": "pelvis", "x": 120, "y": 120},
        {"name": "arm-left", "parent": "torso", "x": -190, "y": 170},
        {"name": "arm-right", "parent": "torso", "x": 190, "y": 170},
    ]
    slots = [
        {"name": "body", "bone": "root", "attachment": "body"},
        {"name": "eyes-closed", "bone": "head"},
    ]
    skins = []
    for body in ("male", "female"):
        eye_local_y = eye_center_y - (650 + 360 + 330)
        skins.append({
            "name": body,
            "attachments": {
                "body": {
                    "body": mesh_attachment(f"body_{body}"),
                },
                "eyes-closed": {
                    "closed": {
                        "path": f"eyes_{body}_closed",
                        "x": 0,
                        "y": round(eye_local_y, 2),
                        "width": EYE_CROP[2] - EYE_CROP[0],
                        "height": EYE_CROP[3] - EYE_CROP[1],
                    },
                },
            },
        })
    frames = [
        deform_frame(0, 0, 0),
        deform_frame(1.5, 1, 0.7),
        deform_frame(3.0, 0, 0),
        deform_frame(4.5, -0.7, -0.7),
        deform_frame(6.0, 0, 0),
    ]
    deform = {
        body: {"body": {"body": frames}}
        for body in ("male", "female")
    }
    return {
        "skeleton": {
            "hash": "wuxia-idle-spine-v1",
            "spine": SPINE_VERSION,
            "x": -CANVAS[0] / 2,
            "y": 0,
            "width": CANVAS[0],
            "height": CANVAS[1],
            "images": "./",
            "audio": "",
        },
        "bones": bones,
        "slots": slots,
        "skins": skins,
        "animations": {
            "idle": {
                "slots": {
                    "eyes-closed": {
                        "attachment": [
                            {"time": 0},
                            {"time": 2.16, "name": "closed"},
                            {"time": 2.28},
                            {"time": 4.91, "name": "closed"},
                            {"time": 5.03},
                            {"time": 6.0},
                        ],
                    },
                },
                "bones": {
                    "hair-tip": {
                        "rotate": [
                            {"time": 0, "angle": 0},
                            {"time": 1.5, "angle": 1.2},
                            {"time": 3, "angle": 0},
                            {"time": 4.5, "angle": -1.1},
                            {"time": 6, "angle": 0},
                        ],
                    },
                    "hem-left": {
                        "rotate": [
                            {"time": 0, "angle": 0},
                            {"time": 1.5, "angle": 1.5},
                            {"time": 3, "angle": 0},
                            {"time": 4.5, "angle": -1.3},
                            {"time": 6, "angle": 0},
                        ],
                    },
                    "hem-right": {
                        "rotate": [
                            {"time": 0, "angle": 0},
                            {"time": 1.5, "angle": 1.1},
                            {"time": 3, "angle": 0},
                            {"time": 4.5, "angle": -1.6},
                            {"time": 6, "angle": 0},
                        ],
                    },
                },
                "deform": deform,
            },
        },
    }


def build_qa(male: Image.Image, female: Image.Image, male_eyes: Image.Image, female_eyes: Image.Image, output: Path) -> None:
    panel = Image.new("RGB", (1536, 864), (13, 18, 20))
    draw = ImageDraw.Draw(panel)
    entries = []
    for body, base, eyes in (("male", male, male_eyes), ("female", female, female_eyes)):
        closed = base.copy()
        closed.alpha_composite(eyes, (EYE_CROP[0], EYE_CROP[1]))
        entries.extend(((f"{body} / open", base), (f"{body} / closed", closed)))
    for index, (label, image) in enumerate(entries):
        tile_x = index * 384
        preview = image.copy()
        preview.thumbnail((350, 520), Image.Resampling.LANCZOS)
        panel.paste(preview, (tile_x + (384 - preview.width) // 2, 36), preview)
        face = image.crop((380, 60, 644, 300)).resize((317, 288), Image.Resampling.LANCZOS)
        panel.paste(face, (tile_x + 34, 570), face)
        draw.text((tile_x + 12, 10), label, fill=(220, 197, 139))
        draw.rectangle((tile_x, 0, tile_x + 383, 863), outline=(80, 95, 95))
    output.parent.mkdir(parents=True, exist_ok=True)
    panel.save(output, format="WEBP", quality=94, method=6)


def preview_motion(image: Image.Image, eyes: Image.Image, phase: float, blink: bool) -> Image.Image:
    scale = 0.375
    width = round(CANVAS[0] * scale)
    height = round(CANVAS[1] * scale)
    base = image.resize((width, height), Image.Resampling.LANCZOS)
    breath = np.sin(phase * np.pi * 2)
    sway = np.sin(phase * np.pi * 2 + 0.65)
    breathed_height = round(height * (1 + breath * 0.0018))
    breathed = base.resize((width, breathed_height), Image.Resampling.BICUBIC)
    frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    frame.alpha_composite(breathed, (0, height - breathed_height))

    garment = frame.crop((round(width * 0.31), round(height * 0.37), round(width * 0.69), round(height * 0.67)))
    strip_height = 3
    for top in range(0, garment.height, strip_height):
        local = top / max(1, garment.height - 1)
        weight = np.sin(local * np.pi)
        offset = round(sway * weight * 1.6)
        strip = garment.crop((0, top, garment.width, min(garment.height, top + strip_height)))
        frame.alpha_composite(strip, (round(width * 0.31) + offset, round(height * 0.37) + top))

    if blink:
        eye_layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        eye_layer.alpha_composite(eyes, (EYE_CROP[0], EYE_CROP[1]))
        eye_layer = eye_layer.resize((width, height), Image.Resampling.LANCZOS)
        frame.alpha_composite(eye_layer)
    return frame


def build_motion_preview(
    male: Image.Image,
    female: Image.Image,
    male_eyes: Image.Image,
    female_eyes: Image.Image,
    output: Path,
) -> None:
    frames: list[Image.Image] = []
    frame_count = 48
    for index in range(frame_count):
        phase = index / frame_count
        blink = index in {17, 18, 39, 40}
        male_frame = preview_motion(male, male_eyes, phase, blink)
        female_frame = preview_motion(female, female_eyes, phase, blink)
        frame = Image.new("RGBA", (male_frame.width * 2, male_frame.height), (13, 18, 20, 255))
        frame.alpha_composite(male_frame, (0, 0))
        frame.alpha_composite(female_frame, (male_frame.width, 0))
        frames.append(frame)
    output.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        output,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=83,
        loop=0,
        lossless=True,
        method=6,
    )


def validate(data: dict, atlas: Image.Image) -> None:
    assert atlas.size == ATLAS
    assert [skin["name"] for skin in data["skins"]] == ["male", "female"]
    assert set(data["animations"]) == {"idle"}
    assert len(data["bones"]) >= 9
    assert set(data["animations"]["idle"]["deform"]) == {"male", "female"}
    for skin in data["skins"]:
        body = skin["attachments"]["body"]["body"]
        assert body["type"] == "mesh"
        assert len(body["uvs"]) == len(body["vertices"])
        assert len(body["triangles"]) > 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a truthful Spine 4.2 idle-animation vertical slice from approved character masters.")
    parser.add_argument("--runtime-dir", type=Path, default=Path("web/assets/appearance/rig-v2"))
    parser.add_argument("--source-dir", type=Path, default=Path("art_source/appearance/spine-v1"))
    parser.add_argument("--output-dir", type=Path, default=Path("art_source/appearance/spine-v1/export"))
    parser.add_argument("--qa-output", type=Path, default=Path("docs/assets/spine-idle-slice-v1.webp"))
    parser.add_argument("--motion-output", type=Path, default=Path("docs/assets/spine-idle-motion-v1.webp"))
    args = parser.parse_args()

    male = load_rgba(args.runtime_dir / "male-clothing-1-v1.webp")
    female = load_rgba(args.runtime_dir / "female-clothing-1-v1.webp")
    male_eyes = make_closed_eye_patch("male", male, load_rgba(args.source_dir / "male-blink-generated.png"))
    female_eyes = make_closed_eye_patch("female", female, load_rgba(args.source_dir / "female-blink-generated.png"))

    args.output_dir.mkdir(parents=True, exist_ok=True)
    atlas_path = args.output_dir / "wuxia-idle.png"
    atlas_file = args.output_dir / "wuxia-idle.atlas"
    json_file = args.output_dir / "wuxia-idle.json"
    pack_atlas(male, female, male_eyes, female_eyes, atlas_path)
    atlas_file.write_text(atlas_text(atlas_path.name), encoding="utf-8")
    data = skeleton_data()
    json_file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    build_qa(male, female, male_eyes, female_eyes, args.qa_output)
    build_motion_preview(male, female, male_eyes, female_eyes, args.motion_output)
    validate(data, load_rgba(atlas_path))
    print(json.dumps({
        "ok": True,
        "spine": SPINE_VERSION,
        "skins": ["male", "female"],
        "animations": ["idle"],
        "bones": len(data["bones"]),
        "atlas": str(atlas_path),
        "skeleton": str(json_file),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
