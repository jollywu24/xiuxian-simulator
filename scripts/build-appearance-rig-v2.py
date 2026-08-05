from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


CANVAS = (1024, 1536)
FIGURE_TOP = 36
FIGURE_BOTTOM = 1500
HEAD_PATCH_SOLID_BOTTOM = 260
HEAD_PATCH_FADE_BOTTOM = 292


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    image.save(temporary, format="WEBP", lossless=True, method=6)
    temporary.replace(path)


def master_transform(base: Image.Image) -> tuple[float, int, int]:
    bbox = base.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("appearance master has no visible pixels")
    visible_height = bbox[3] - bbox[1]
    scale = (FIGURE_BOTTOM - FIGURE_TOP) / visible_height
    center_x = (bbox[0] + bbox[2]) / 2
    offset_x = round(CANVAS[0] / 2 - center_x * scale)
    offset_y = round(FIGURE_TOP - bbox[1] * scale)
    return scale, offset_x, offset_y


def normalize_master(image: Image.Image, source_size: tuple[int, int], transform: tuple[float, int, int]) -> Image.Image:
    if image.size != source_size:
        image = image.resize(source_size, Image.Resampling.LANCZOS)
    scale, offset_x, offset_y = transform
    resized = image.resize(
        (round(source_size[0] * scale), round(source_size[1] * scale)),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (offset_x, offset_y))
    return canvas


def head_variant(full_master: Image.Image) -> Image.Image:
    patch = full_master.copy()
    vertical = Image.new("L", CANVAS, 0)
    draw = ImageDraw.Draw(vertical)
    draw.rectangle((0, 0, CANVAS[0], HEAD_PATCH_SOLID_BOTTOM), fill=255)
    fade_height = HEAD_PATCH_FADE_BOTTOM - HEAD_PATCH_SOLID_BOTTOM
    for row in range(fade_height):
        alpha = round(255 * (1 - row / max(1, fade_height - 1)))
        y = HEAD_PATCH_SOLID_BOTTOM + row
        draw.line((0, y, CANVAS[0], y), fill=alpha)
    patch.putalpha(Image.composite(patch.getchannel("A"), Image.new("L", CANVAS, 0), vertical))
    return patch


def build_body(body: str, source_dir: Path, output_dir: Path) -> dict[str, Image.Image]:
    base_source = load_rgba(source_dir / f"{body}-base.png")
    source_size = base_source.size
    transform = master_transform(base_source)

    base = normalize_master(base_source, source_size, transform)
    outfit = normalize_master(load_rgba(source_dir / f"{body}-outfit-indigo.png"), source_size, transform)
    headband_full = normalize_master(load_rgba(source_dir / f"{body}-headband.png"), source_size, transform)
    headband = head_variant(headband_full)

    assets = {
        "clothing-1": base,
        "clothing-2": outfit,
        "head-2": headband,
    }
    for name, image in assets.items():
        save_webp(image, output_dir / f"{body}-{name}-v1.webp")
    return assets


def composite(assets: dict[str, Image.Image], clothing: int, head: int) -> Image.Image:
    result = assets[f"clothing-{clothing}"].copy()
    if head == 2:
        result = Image.alpha_composite(result, assets["head-2"])
    return result


def build_qa_matrix(all_assets: dict[str, dict[str, Image.Image]], target: Path) -> None:
    tile = (384, 576)
    combinations = [
        (body, clothing, head)
        for body in ("male", "female")
        for clothing in (1, 2)
        for head in (1, 2)
    ]
    matrix = Image.new("RGB", (tile[0] * 4, tile[1] * 2), (13, 18, 20))
    draw = ImageDraw.Draw(matrix)
    font = ImageFont.load_default()
    for index, (body, clothing, head) in enumerate(combinations):
        preview = composite(all_assets[body], clothing, head)
        preview.thumbnail((tile[0], tile[1] - 28), Image.Resampling.LANCZOS)
        left = (index % 4) * tile[0]
        top = (index // 4) * tile[1]
        paste_x = left + (tile[0] - preview.width) // 2
        paste_y = top + 28 + (tile[1] - 28 - preview.height) // 2
        matrix.paste(preview, (paste_x, paste_y), preview)
        label = f"{body} / clothing {clothing} / head {head}"
        draw.text((left + 10, top + 8), label, fill=(220, 197, 139), font=font)
        draw.rectangle((left, top, left + tile[0] - 1, top + tile[1] - 1), outline=(90, 105, 105), width=1)
    target.parent.mkdir(parents=True, exist_ok=True)
    matrix.save(target, format="WEBP", quality=92, method=6)


def validate(output_dir: Path) -> None:
    expected = {
        f"{body}-{name}-v1.webp"
        for body in ("male", "female")
        for name in ("clothing-1", "clothing-2", "head-2")
    }
    actual = {path.name for path in output_dir.glob("*.webp")}
    if actual != expected:
        raise SystemExit(f"appearance rig v2 asset mismatch: expected={sorted(expected)} actual={sorted(actual)}")
    for path in sorted(output_dir.glob("*.webp")):
        image = load_rgba(path)
        if image.size != CANVAS:
            raise SystemExit(f"wrong canvas {path.name}: {image.size}")
        bbox = image.getchannel("A").getbbox()
        if not bbox:
            raise SystemExit(f"empty runtime asset {path.name}")
        if "head-2" in path.name and bbox[3] > HEAD_PATCH_FADE_BOTTOM:
            raise SystemExit(f"head variant escaped authored head region {path.name}: {bbox}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build appearance rig v2 from coherent full-character masters.")
    parser.add_argument("--source-dir", type=Path, default=Path("art_source/appearance/rig-v2"))
    parser.add_argument("--output-dir", type=Path, default=Path("web/assets/appearance/rig-v2"))
    parser.add_argument("--qa-output", type=Path, default=Path("docs/assets/appearance-rig-v2-matrix.webp"))
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for obsolete in args.output_dir.glob("*.webp"):
        obsolete.unlink()
    all_assets = {
        body: build_body(body, args.source_dir, args.output_dir)
        for body in ("male", "female")
    }
    validate(args.output_dir)
    build_qa_matrix(all_assets, args.qa_output)
    print(f"appearance rig v2 built: {len(list(args.output_dir.glob('*.webp')))} assets")


if __name__ == "__main__":
    main()
