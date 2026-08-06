from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


CANVAS = (1024, 1536)
FIGURE_TOP = 54
FIGURE_BOTTOM = 1536
VISIBLE_HEIGHT_FRACTION = 0.78
LOOKS = (
    ("male", 1),
    ("male", 2),
    ("female", 1),
    ("female", 2),
)


def smoothstep(value: np.ndarray, low: float, high: float) -> np.ndarray:
    scaled = np.clip((value - low) / (high - low), 0.0, 1.0)
    return scaled * scaled * (3.0 - 2.0 * scaled)


def remove_magenta_key(image: Image.Image) -> Image.Image:
    """Remove the generated flat magenta backing and neutralise edge spill."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    red, green, blue = np.moveaxis(rgb, -1, 0)
    magenta_min = np.minimum(red, blue)
    magenta_dominance = magenta_min - green
    magenta_balance = 1.0 - np.abs(red - blue) / 255.0

    key_probability = (
        smoothstep(magenta_dominance, 30.0, 88.0)
        * smoothstep(magenta_min, 34.0, 156.0)
        * smoothstep(magenta_balance, 0.42, 0.82)
    )
    alpha = 1.0 - key_probability
    alpha[alpha < 0.025] = 0.0
    alpha[alpha > 0.975] = 1.0

    edge_pixels = np.concatenate((
        rgb[:24].reshape(-1, 3),
        rgb[-24:].reshape(-1, 3),
        rgb[:, :24].reshape(-1, 3),
        rgb[:, -24:].reshape(-1, 3),
    ))
    chroma = np.median(edge_pixels, axis=0)
    safe_alpha = np.maximum(alpha[..., None], 0.08)
    foreground = (rgb - (1.0 - alpha[..., None]) * chroma) / safe_alpha
    foreground = np.where(alpha[..., None] < 0.08, 0.0, foreground)
    foreground = np.clip(foreground, 0.0, 255.0).astype(np.uint8)
    alpha_bytes = np.round(alpha * 255.0).astype(np.uint8)
    return Image.fromarray(np.dstack((foreground, alpha_bytes)), mode="RGBA")


def normalize_portrait(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("appearance portrait has no visible pixels")

    # Image generation may leave one character at the knees and another at the
    # upper thigh. The creation screen has one fixed medium portrait camera, so
    # crop every source at the same fraction of its visible figure before the
    # shared-canvas transform. Runtime CSS must never compensate per portrait.
    crop_bottom = round(bbox[1] + (bbox[3] - bbox[1]) * VISIBLE_HEIGHT_FRACTION)
    cropped = image.copy()
    cropped.paste((0, 0, 0, 0), (0, crop_bottom, cropped.width, cropped.height))
    bbox = cropped.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("appearance portrait vanished during camera crop")

    visible_height = bbox[3] - bbox[1]
    scale = (FIGURE_BOTTOM - FIGURE_TOP) / visible_height
    visible_width = bbox[2] - bbox[0]
    if visible_width * scale > CANVAS[0] * 0.88:
        scale = (CANVAS[0] * 0.88) / visible_width

    resized = cropped.resize(
        (round(cropped.width * scale), round(cropped.height * scale)),
        Image.Resampling.LANCZOS,
    )
    scaled_bbox = resized.getchannel("A").getbbox()
    if not scaled_bbox:
        raise ValueError("appearance portrait vanished during resize")

    offset_x = round(CANVAS[0] / 2 - (scaled_bbox[0] + scaled_bbox[2]) / 2)
    offset_y = round(FIGURE_TOP - scaled_bbox[1])
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (offset_x, offset_y))
    return canvas


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    image.save(temporary, format="WEBP", quality=93, alpha_quality=100, method=6)
    temporary.replace(path)


def build_portraits(source_dir: Path, output_dir: Path) -> dict[tuple[str, int], Image.Image]:
    portraits: dict[tuple[str, int], Image.Image] = {}
    output_dir.mkdir(parents=True, exist_ok=True)
    for obsolete in output_dir.glob("*.webp"):
        obsolete.unlink()

    for body, look in LOOKS:
        source = Image.open(source_dir / f"{body}-look-{look}-chroma.png")
        portrait = normalize_portrait(remove_magenta_key(source))
        portraits[(body, look)] = portrait
        save_webp(portrait, output_dir / f"{body}-look-{look}-v1.webp")
    return portraits


def build_qa_matrix(portraits: dict[tuple[str, int], Image.Image], target: Path) -> None:
    tile = (512, 768)
    matrix = Image.new("RGB", (tile[0] * 2, tile[1] * 2), (239, 235, 222))
    draw = ImageDraw.Draw(matrix)
    font = ImageFont.load_default()
    for index, key in enumerate(LOOKS):
        preview = portraits[key].copy()
        preview.thumbnail((tile[0], tile[1] - 34), Image.Resampling.LANCZOS)
        left = (index % 2) * tile[0]
        top = (index // 2) * tile[1]
        matrix.paste(preview, (left + (tile[0] - preview.width) // 2, top + 30), preview)
        draw.text((left + 12, top + 10), f"{key[0]} / look {key[1]}", fill=(47, 75, 76), font=font)
        draw.rectangle((left, top, left + tile[0] - 1, top + tile[1] - 1), outline=(155, 128, 75), width=1)
    target.parent.mkdir(parents=True, exist_ok=True)
    matrix.save(target, format="WEBP", quality=92, method=6)


def validate(output_dir: Path) -> None:
    expected = {f"{body}-look-{look}-v1.webp" for body, look in LOOKS}
    actual = {path.name for path in output_dir.glob("*.webp")}
    if actual != expected:
        raise SystemExit(f"appearance rig v3 asset mismatch: expected={sorted(expected)} actual={sorted(actual)}")

    for path in sorted(output_dir.glob("*.webp")):
        image = Image.open(path).convert("RGBA")
        if image.size != CANVAS:
            raise SystemExit(f"wrong canvas {path.name}: {image.size}")
        alpha = image.getchannel("A")
        bbox = alpha.getbbox()
        if not bbox:
            raise SystemExit(f"empty runtime asset {path.name}")
        if bbox[0] < 45 or bbox[2] > CANVAS[0] - 45:
            raise SystemExit(f"portrait has insufficient side margin {path.name}: {bbox}")
        if bbox[1] < 42 or bbox[1] > 72:
            raise SystemExit(f"portrait top is off contract {path.name}: {bbox}")
        if alpha.getpixel((0, 0)) != 0:
            raise SystemExit(f"chroma key remains in corner {path.name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build four coherent half-body appearance portraits.")
    parser.add_argument("--source-dir", type=Path, default=Path("art_source/appearance/rig-v3"))
    parser.add_argument("--output-dir", type=Path, default=Path("web/assets/appearance/rig-v3"))
    parser.add_argument("--qa-output", type=Path, default=Path("docs/assets/appearance-rig-v3-matrix.webp"))
    args = parser.parse_args()

    portraits = build_portraits(args.source_dir, args.output_dir)
    validate(args.output_dir)
    build_qa_matrix(portraits, args.qa_output)
    print(f"appearance rig v3 built: {len(portraits)} half-body portraits")


if __name__ == "__main__":
    main()
