from __future__ import annotations

import argparse
from pathlib import Path

from itertools import product

from PIL import Image, ImageChops, ImageDraw, ImageFilter


CANVAS = (1024, 1536)
PART_COUNTS = {
    "frontHair": 2,
    "backHair": 2,
    "eyes": 2,
    "brows": 2,
    "mouth": 2,
    "nose": 2,
    "faceShape": 2,
    "backAccessory": 2,
    "clothing": 2,
    "faceAccessory": 2,
}


def load_rgba(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    if image.size != CANVAS:
        raise ValueError(f"{path} must keep the full {CANVAS[0]}x{CANVAS[1]} canvas; got {image.size}")
    return image


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    image.save(temporary, format="WEBP", lossless=True, method=6)
    temporary.replace(path)


def copy_full_canvas(source: Path, target: Path) -> None:
    save_webp(load_rgba(source), target)


def transparent_canvas() -> Image.Image:
    return Image.new("RGBA", CANVAS, (0, 0, 0, 0))


def hair_mask(hat: Image.Image) -> Image.Image:
    # The mask follows the actual opaque hat attachment instead of cutting a guessed
    # rectangle from every hairstyle. A tiny dilation hides antialiasing seams while
    # keeping the open forehead and face untouched.
    mask = hat.getchannel("A").filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = Image.new("RGBA", CANVAS, (255, 255, 255, 0))
    rgba.putalpha(mask)
    return rgba


def build_body(body: str, source_dir: Path, output_dir: Path) -> None:
    save_webp(transparent_canvas(), output_dir / f"{body}-base-v4.webp")

    for part, count in PART_COUNTS.items():
        for item_id in range(1, count + 1):
            if part in {"backAccessory", "faceAccessory"} and item_id == 1:
                continue
            source = source_dir / f"{body}-{part}-{item_id}-v2.webp"
            target = output_dir / f"{body}-{part}-{item_id}-v3.webp"
            copy_full_canvas(source, target)

    for hat_id in (2, 3):
        hat = load_rgba(source_dir / f"{body}-hat-{hat_id}-v2.webp")
        copy_full_canvas(
            source_dir / f"{body}-hat-{hat_id}-v2.webp",
            output_dir / f"{body}-hat-{hat_id}-front-v3.webp",
        )
        save_webp(hair_mask(hat), output_dir / f"{body}-hat-{hat_id}-hair-mask-v3.webp")


def validate(output_dir: Path) -> None:
    failures: list[str] = []
    for path in sorted(output_dir.glob("*.webp")):
        image = Image.open(path).convert("RGBA")
        if image.size != CANVAS:
            failures.append(f"wrong canvas {path.name}: {image.size}")
        if "base-v4" not in path.name and image.getchannel("A").getbbox() is None:
            failures.append(f"empty runtime attachment {path.name}")
        if "hair-mask" in path.name:
            bbox = image.getchannel("A").getbbox()
            if not bbox or bbox[0] < 360 or bbox[2] > 664 or bbox[1] < 0 or bbox[3] > 230:
                failures.append(f"hair mask escaped the authored head region {path.name}: {bbox}")
    if failures:
        raise SystemExit("\n".join(failures))


def masked_attachment(image: Image.Image, mask: Image.Image | None) -> Image.Image:
    if mask is None:
        return image
    clipped = image.copy()
    clipped.putalpha(ImageChops.subtract(clipped.getchannel("A"), mask.getchannel("A")))
    return clipped


def composite_preview(
    output_dir: Path,
    body: str,
    hat: int,
    front_hair: int,
    back_hair: int,
    clothing: int,
    face_shape: int,
) -> Image.Image:
    result = transparent_canvas()
    mask = load_rgba(output_dir / f"{body}-hat-{hat}-hair-mask-v3.webp") if hat > 1 else None
    layers = [
        masked_attachment(load_rgba(output_dir / f"{body}-backHair-{back_hair}-v3.webp"), mask),
        load_rgba(output_dir / f"{body}-base-v4.webp"),
        load_rgba(output_dir / f"{body}-clothing-{clothing}-v3.webp"),
        load_rgba(output_dir / f"{body}-faceShape-{face_shape}-v3.webp"),
        load_rgba(output_dir / f"{body}-eyes-1-v3.webp"),
        load_rgba(output_dir / f"{body}-brows-1-v3.webp"),
        load_rgba(output_dir / f"{body}-nose-1-v3.webp"),
        load_rgba(output_dir / f"{body}-mouth-1-v3.webp"),
        masked_attachment(load_rgba(output_dir / f"{body}-frontHair-{front_hair}-v3.webp"), mask),
    ]
    if hat > 1:
        layers.append(load_rgba(output_dir / f"{body}-hat-{hat}-front-v3.webp"))
    for layer in layers:
        result = Image.alpha_composite(result, layer)
    return result


def build_qa_matrix(output_dir: Path, target: Path) -> None:
    tile = (128, 192)
    columns = 12
    combinations = list(product(("male", "female"), (1, 2, 3), (1, 2), (1, 2), (1, 2), (1, 2)))
    rows = (len(combinations) + columns - 1) // columns
    matrix = Image.new("RGB", (tile[0] * columns, tile[1] * rows), (18, 26, 28))
    draw = ImageDraw.Draw(matrix)
    for index, (body, hat, front_hair, back_hair, clothing, face_shape) in enumerate(combinations):
        preview = composite_preview(output_dir, body, hat, front_hair, back_hair, clothing, face_shape)
        preview.thumbnail(tile, Image.Resampling.LANCZOS)
        left = (index % columns) * tile[0]
        top = (index // columns) * tile[1]
        matrix.paste(preview.convert("RGB"), (left, top))
        border = (105, 137, 137) if body == "male" else (141, 112, 128)
        draw.rectangle((left, top, left + tile[0] - 1, top + tile[1] - 1), outline=border, width=1)
    target.parent.mkdir(parents=True, exist_ok=True)
    matrix.save(target, format="WEBP", quality=90, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the fixed-canvas appearance rig vertical slice.")
    parser.add_argument("--source-dir", type=Path, default=Path("web/assets/appearance/layered"))
    parser.add_argument("--output-dir", type=Path, default=Path("web/assets/appearance/rig-v1"))
    parser.add_argument("--qa-output", type=Path)
    args = parser.parse_args()

    for body in ("male", "female"):
        build_body(body, args.source_dir, args.output_dir)
    validate(args.output_dir)
    if args.qa_output:
        build_qa_matrix(args.output_dir, args.qa_output)
    print(f"appearance rig built: {len(list(args.output_dir.glob('*.webp')))} assets")


if __name__ == "__main__":
    main()
