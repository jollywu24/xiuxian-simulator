"""Build a deterministic two-option layered appearance rig.

The approved look-1 portraits remain the common visual master.  Alternative
facial and hair parts are derived from that same master on a shared canvas, so
every option keeps the face anchor, neckline and shoulder line.  Outfit 2 is an
identity-preserving edit of the same master and is normalized to the same
camera. Runtime assets are sparse transparent WebP layers. Replacement
patches keep their feathered local backing so they never cut holes through the
underlying portrait.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


CANVAS = (1024, 1536)
FIGURE_TOP = 54
FIGURE_BOTTOM = 1536
VISIBLE_HEIGHT_FRACTION = 0.78
BODIES = ("male", "female")
REPLACEABLE_PARTS = ("frontHair", "backHair", "faceShape", "eyes", "brows", "nose", "mouth")


def smoothstep(value: np.ndarray, low: float, high: float) -> np.ndarray:
    scaled = np.clip((value - low) / (high - low), 0.0, 1.0)
    return scaled * scaled * (3.0 - 2.0 * scaled)


def remove_magenta_key(image: Image.Image) -> Image.Image:
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
        rgb[:24].reshape(-1, 3), rgb[-24:].reshape(-1, 3),
        rgb[:, :24].reshape(-1, 3), rgb[:, -24:].reshape(-1, 3),
    ))
    chroma = np.median(edge_pixels, axis=0)
    safe_alpha = np.maximum(alpha[..., None], 0.08)
    foreground = (rgb - (1.0 - alpha[..., None]) * chroma) / safe_alpha
    foreground = np.where(alpha[..., None] < 0.08, 0.0, foreground)
    foreground = np.clip(foreground, 0.0, 255.0).astype(np.uint8)
    return Image.fromarray(
        np.dstack((foreground, np.round(alpha * 255.0).astype(np.uint8))),
        mode="RGBA",
    )


def normalize_portrait(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("appearance portrait has no visible pixels")
    crop_bottom = round(bbox[1] + (bbox[3] - bbox[1]) * VISIBLE_HEIGHT_FRACTION)
    cropped = image.copy()
    cropped.paste((0, 0, 0, 0), (0, crop_bottom, cropped.width, cropped.height))
    bbox = cropped.getchannel("A").getbbox()
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
    offset_x = round(CANVAS[0] / 2 - (scaled_bbox[0] + scaled_bbox[2]) / 2)
    offset_y = round(FIGURE_TOP - scaled_bbox[1])
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (offset_x, offset_y))
    return canvas


def save_webp(image: Image.Image, path: Path, *, lossless: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    image.save(
        temporary,
        format="WEBP",
        lossless=lossless,
        quality=94,
        alpha_quality=100,
        method=6,
    )
    temporary.replace(path)


def soft_mask(*, ellipses=(), rectangles=(), polygons=(), blur=5) -> Image.Image:
    mask = Image.new("L", CANVAS, 0)
    draw = ImageDraw.Draw(mask)
    for box in ellipses:
        draw.ellipse(box, fill=255)
    for box in rectangles:
        draw.rectangle(box, fill=255)
    for points in polygons:
        draw.polygon(points, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(blur)) if blur else mask


def alpha_layer(image: Image.Image, mask: Image.Image) -> Image.Image:
    result = image.copy()
    result.putalpha(ImageChops.multiply(image.getchannel("A"), mask))
    return result


def mask_asset(mask: Image.Image) -> Image.Image:
    result = Image.new("RGBA", CANVAS, (255, 255, 255, 0))
    result.putalpha(mask)
    return result


def transform_region(image: Image.Image, mask: Image.Image, *, scale_x=1.0, scale_y=1.0, shift_x=0, shift_y=0, mirror=False) -> Image.Image:
    source = alpha_layer(image, mask)
    bbox = source.getchannel("A").getbbox()
    if not bbox:
        return source
    patch = source.crop(bbox)
    if mirror:
        patch = ImageOps.mirror(patch)
    patch = patch.resize(
        (max(1, round(patch.width * scale_x)), max(1, round(patch.height * scale_y))),
        Image.Resampling.LANCZOS,
    )
    center_x = round((bbox[0] + bbox[2]) / 2 + shift_x)
    center_y = round((bbox[1] + bbox[3]) / 2 + shift_y)
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    layer.alpha_composite(patch, (center_x - patch.width // 2, center_y - patch.height // 2))
    return layer


def part_masks() -> dict[str, Image.Image]:
    face = soft_mask(ellipses=[(382, 168, 642, 506)], blur=8)
    features = {
        "faceShape": face,
        "eyes": soft_mask(ellipses=[(407, 271, 512, 350), (512, 271, 617, 350)], blur=6),
        "brows": soft_mask(ellipses=[(398, 232, 514, 310), (510, 232, 626, 310)], blur=5),
        "nose": soft_mask(ellipses=[(464, 294, 560, 404)], blur=6),
        "mouth": soft_mask(ellipses=[(438, 371, 586, 449)], blur=5),
        "frontHair": soft_mask(
            ellipses=[(350, 78, 674, 342)],
            polygons=[[(350, 240), (674, 240), (632, 360), (392, 360)]],
            blur=5,
        ),
        "backHair": soft_mask(
            ellipses=[(318, 34, 706, 560)],
            polygons=[[(330, 285), (694, 285), (720, 570), (304, 570)]],
            blur=6,
        ),
    }
    features["backHair"] = ImageChops.subtract(
        features["backHair"],
        soft_mask(ellipses=[(374, 156, 650, 508)], blur=8),
    )
    return features


def hair_alpha(image: Image.Image, region: Image.Image) -> Image.Image:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32)
    rgb = data[:, :, :3]
    alpha = data[:, :, 3] / 255.0
    value = rgb.mean(axis=2)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    dark = np.clip((150.0 - value) / 72.0, 0.0, 1.0)
    neutral = np.clip((72.0 - spread) / 45.0, 0.0, 1.0)
    derived = Image.fromarray(np.uint8(dark * neutral * alpha * 255.0), "L")
    derived = ImageChops.multiply(derived, region)
    return derived.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.2))


def accessory_layers(body: str) -> dict[str, Image.Image]:
    layers: dict[str, Image.Image] = {}

    hat = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(hat, "RGBA")
    draw.rounded_rectangle((459, 52, 565, 122), radius=18, fill=(34, 45, 43, 238), outline=(183, 143, 72, 245), width=5)
    draw.polygon([(474, 63), (512, 35), (550, 63), (541, 108), (483, 108)], fill=(27, 37, 36, 228), outline=(196, 154, 78, 245))
    draw.line((484, 88, 540, 88), fill=(218, 175, 94, 230), width=4)
    draw.ellipse((503, 77, 521, 95), fill=(60, 105, 102, 255), outline=(224, 184, 104, 255), width=3)
    layers["hat"] = hat.filter(ImageFilter.GaussianBlur(0.35))

    sword = Image.new("RGBA", (170, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(sword, "RGBA")
    draw.rounded_rectangle((65, 150, 108, 1010), radius=18, fill=(38, 30, 27, 250), outline=(142, 104, 58, 240), width=6)
    draw.polygon([(65, 995), (108, 995), (86, 1062)], fill=(32, 27, 25, 250), outline=(160, 118, 65, 235))
    draw.rounded_rectangle((70, 44, 103, 174), radius=12, fill=(52, 43, 37, 255), outline=(194, 148, 76, 245), width=5)
    draw.line((55, 146, 119, 146), fill=(211, 166, 88, 250), width=10)
    draw.ellipse((77, 20, 96, 56), fill=(63, 102, 99, 255), outline=(218, 176, 97, 255), width=4)
    sword = sword.rotate(10 if body == "male" else 8, resample=Image.Resampling.BICUBIC, expand=True)
    back = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    back.alpha_composite(sword, (640 if body == "male" else 655, 205))
    layers["backAccessory"] = back.filter(ImageFilter.GaussianBlur(0.35))

    face = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(face, "RGBA")
    if body == "male":
        draw.line((587, 332, 606, 361), fill=(121, 62, 54, 205), width=5)
        draw.line((590, 335, 607, 356), fill=(226, 166, 134, 125), width=2)
    else:
        for x, y in ((445, 347), (458, 355), (574, 350), (589, 343)):
            draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(118, 70, 54, 190))
    layers["faceAccessory"] = face.filter(ImageFilter.GaussianBlur(0.3))
    return layers


def feature_variant_layers(body: str) -> dict[str, Image.Image]:
    """Paint restrained feature accents on the shared face anchor.

    These are transparent line layers, not copied skin patches, so selecting
    several facial options cannot duplicate the face or expose seams.
    """
    layers: dict[str, Image.Image] = {}
    ink = (57, 43, 39, 170)
    warm = (132, 78, 59, 135)
    light = (234, 202, 166, 120)
    y_shift = 2 if body == "female" else 0

    eyes = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(eyes, "RGBA")
    draw.line([(420, 313 + y_shift), (455, 324 + y_shift), (493, 312 + y_shift)], fill=ink, width=5, joint="curve")
    draw.line([(531, 312 + y_shift), (568, 324 + y_shift), (604, 310 + y_shift)], fill=ink, width=5, joint="curve")
    draw.ellipse((456, 314 + y_shift, 466, 326 + y_shift), fill=(36, 34, 31, 165))
    draw.ellipse((560, 314 + y_shift, 570, 326 + y_shift), fill=(36, 34, 31, 165))
    layers["eyes"] = eyes.filter(ImageFilter.GaussianBlur(0.45))

    brows = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(brows, "RGBA")
    draw.line([(414, 278 + y_shift), (452, 266 + y_shift), (493, 273 + y_shift)], fill=ink, width=7, joint="curve")
    draw.line([(530, 273 + y_shift), (571, 264 + y_shift), (612, 278 + y_shift)], fill=ink, width=7, joint="curve")
    layers["brows"] = brows.filter(ImageFilter.GaussianBlur(0.5))

    nose = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(nose, "RGBA")
    draw.line([(510, 321 + y_shift), (502, 360 + y_shift), (510, 382 + y_shift)], fill=warm, width=4)
    draw.line([(518, 323 + y_shift), (523, 356 + y_shift)], fill=light, width=3)
    layers["nose"] = nose.filter(ImageFilter.GaussianBlur(0.7))

    mouth = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(mouth, "RGBA")
    draw.line([(466, 413 + y_shift), (511, 421 + y_shift), (558, 411 + y_shift)], fill=warm, width=5, joint="curve")
    draw.line([(484, 426 + y_shift), (511, 431 + y_shift), (539, 425 + y_shift)], fill=(99, 57, 51, 105), width=3)
    layers["mouth"] = mouth.filter(ImageFilter.GaussianBlur(0.55))

    face_shape = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(face_shape, "RGBA")
    draw.line([(405, 337), (420, 414), (459, 474)], fill=(71, 50, 43, 105), width=6, joint="curve")
    draw.line([(619, 337), (605, 414), (565, 474)], fill=(71, 50, 43, 105), width=6, joint="curve")
    layers["faceShape"] = face_shape.filter(ImageFilter.GaussianBlur(1.2))
    return layers


def build_body(body: str, master_dir: Path, source_dir: Path, output_dir: Path) -> dict[str, Image.Image]:
    base = normalize_portrait(remove_magenta_key(Image.open(master_dir / f"{body}-look-1-chroma.png")))
    outfit = normalize_portrait(remove_magenta_key(Image.open(source_dir / f"{body}-outfit-2-chroma.png")))
    masks = part_masks()
    assets: dict[str, Image.Image] = {
        "base": base,
        "clothing-2": outfit,
    }

    # Each patch comes from the approved base itself; only its local geometry is
    # changed.  This avoids generated eyes, collars or hair from drifting off the
    # shared face and shoulder anchors.
    for part, layer in feature_variant_layers(body).items():
        assets[f"{part}-2"] = layer

    face_cut = soft_mask(ellipses=[(382, 250, 642, 515)], blur=6)
    front_mask = ImageChops.subtract(hair_alpha(base, masks["frontHair"]), face_cut)
    back_mask = hair_alpha(base, masks["backHair"])
    assets["frontHair-2"] = transform_region(base, front_mask, scale_x=1.06, shift_x=6, mirror=True)
    assets["backHair-2"] = transform_region(base, back_mask, scale_x=1.10, scale_y=1.08, shift_y=8)
    assets.update(accessory_layers(body))

    for key, image in assets.items():
        suffix = "v1.webp"
        filename = f"{body}-{key.replace('Hair', '-hair').replace('Shape', '-shape').replace('Accessory', '-accessory')}-{suffix}"
        save_webp(image, output_dir / filename, lossless=(key in {"hat", "backAccessory", "faceAccessory"}))
    return assets


def composite(assets: dict[str, Image.Image], selected: dict[str, int]) -> Image.Image:
    result = assets["clothing-2" if selected.get("clothing") == 2 else "base"].copy()
    order = ("faceShape", "eyes", "brows", "nose", "mouth", "backHair", "frontHair")
    for part in order:
        if selected.get(part) != 2:
            continue
        result.alpha_composite(assets[f"{part}-2"])
    if selected.get("faceAccessory") == 2:
        result.alpha_composite(assets["faceAccessory"])
    if selected.get("hat") == 2:
        result.alpha_composite(assets["hat"])
    return result


def build_qa(all_assets: dict[str, dict[str, Image.Image]], target: Path) -> None:
    presets = (
        {"clothing": 1},
        {"clothing": 2, "hat": 2, "faceAccessory": 2},
        {part: 2 for part in REPLACEABLE_PARTS},
        {"clothing": 2, "hat": 2, "faceAccessory": 2, **{part: 2 for part in REPLACEABLE_PARTS}},
    )
    tile = (384, 576)
    matrix = Image.new("RGB", (tile[0] * 4, tile[1] * 2), (239, 235, 222))
    draw = ImageDraw.Draw(matrix)
    for row, body in enumerate(BODIES):
        for column, preset in enumerate(presets):
            preview = composite(all_assets[body], preset)
            preview.thumbnail((tile[0], tile[1] - 28), Image.Resampling.LANCZOS)
            left, top = column * tile[0], row * tile[1]
            matrix.paste(preview, (left + (tile[0] - preview.width) // 2, top + 28), preview)
            draw.text((left + 10, top + 8), f"{body} / preset {column + 1}", fill=(47, 75, 76))
            draw.rectangle((left, top, left + tile[0] - 1, top + tile[1] - 1), outline=(155, 128, 75))
    target.parent.mkdir(parents=True, exist_ok=True)
    matrix.save(target, "WEBP", quality=92, method=6)


def validate(output_dir: Path) -> None:
    expected_per_body = {
        "base", "clothing-2", "hat", "back-accessory", "face-accessory",
        *[f"{part.replace('Hair', '-hair').replace('Shape', '-shape')}-2" for part in REPLACEABLE_PARTS],
    }
    expected = {f"{body}-{name}-v1.webp" for body in BODIES for name in expected_per_body}
    actual = {path.name for path in output_dir.glob("*.webp")}
    if actual != expected:
        raise SystemExit(f"appearance rig v4 asset mismatch: missing={sorted(expected - actual)} extra={sorted(actual - expected)}")
    for path in output_dir.glob("*.webp"):
        image = Image.open(path).convert("RGBA")
        if image.size != CANVAS or not image.getchannel("A").getbbox():
            raise SystemExit(f"invalid runtime appearance asset: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the aligned layered appearance rig v4.")
    parser.add_argument("--master-dir", type=Path, default=Path("art_source/appearance/rig-v3"))
    parser.add_argument("--source-dir", type=Path, default=Path("art_source/appearance/rig-v4"))
    parser.add_argument("--output-dir", type=Path, default=Path("web/assets/appearance/rig-v4"))
    parser.add_argument("--qa-output", type=Path, default=Path("docs/assets/appearance-rig-v4-matrix.webp"))
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for obsolete in args.output_dir.glob("*.webp"):
        obsolete.unlink()
    all_assets = {body: build_body(body, args.master_dir, args.source_dir, args.output_dir) for body in BODIES}
    validate(args.output_dir)
    build_qa(all_assets, args.qa_output)
    print(f"appearance rig v4 built: {len(list(args.output_dir.glob('*.webp')))} assets")


if __name__ == "__main__":
    main()
