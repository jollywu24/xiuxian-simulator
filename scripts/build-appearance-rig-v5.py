"""Build the fixed-anchor appearance rig v5.

The runtime follows a Photoshop-style layer contract:

1. a clothing/pose layer may change freely;
2. one canonical head replaces the generated head at a fixed 1024x1536 anchor;
3. front/back hair choices are compiled against that canonical face;
4. facial options are small replacement patches cut from that same head;
5. accessories remain transparent layers on the same canvas.

This makes clothing changes incapable of moving or repainting the face.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps


CANVAS = (1024, 1536)
FIGURE_TOP = 54
FIGURE_BOTTOM = 1536
VISIBLE_HEIGHT_FRACTION = 0.78
BODIES = ("male", "female")
FEATURE_PARTS = ("face-shape", "eyes", "brows", "nose", "mouth")
FEATURE_BOXES = {
    "face-shape": (382, 176, 642, 506),
    "eyes": (398, 282, 626, 352),
    "brows": (396, 244, 628, 303),
    "nose": (468, 304, 556, 406),
    "mouth": (438, 392, 586, 450),
}


def smoothstep(value: np.ndarray, low: float, high: float) -> np.ndarray:
    scaled = np.clip((value - low) / (high - low), 0.0, 1.0)
    return scaled * scaled * (3.0 - 2.0 * scaled)


def remove_magenta_key(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    red, green, blue = np.moveaxis(rgb, -1, 0)
    magenta_min = np.minimum(red, blue)
    dominance = magenta_min - green
    balance = 1.0 - np.abs(red - blue) / 255.0
    probability = (
        smoothstep(dominance, 30.0, 88.0)
        * smoothstep(magenta_min, 34.0, 156.0)
        * smoothstep(balance, 0.42, 0.82)
    )
    alpha = 1.0 - probability
    alpha[alpha < 0.025] = 0.0
    alpha[alpha > 0.975] = 1.0
    edges = np.concatenate((
        rgb[:24].reshape(-1, 3),
        rgb[-24:].reshape(-1, 3),
        rgb[:, :24].reshape(-1, 3),
        rgb[:, -24:].reshape(-1, 3),
    ))
    key = np.median(edges, axis=0)
    safe_alpha = np.maximum(alpha[..., None], 0.08)
    foreground = (rgb - (1.0 - alpha[..., None]) * key) / safe_alpha
    foreground = np.where(alpha[..., None] < 0.08, 0.0, foreground)
    rgba = np.dstack((
        np.clip(foreground, 0.0, 255.0).astype(np.uint8),
        np.round(alpha * 255.0).astype(np.uint8),
    ))
    return Image.fromarray(rgba, mode="RGBA")


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
    image.save(temporary, "WEBP", lossless=lossless, quality=94, alpha_quality=100, method=4)
    temporary.replace(path)


def geometric_mask(*, rectangles=(), ellipses=(), polygons=(), blur=0) -> Image.Image:
    mask = Image.new("L", CANVAS, 0)
    draw = ImageDraw.Draw(mask)
    for box in rectangles:
        draw.rectangle(box, fill=255)
    for box in ellipses:
        draw.ellipse(box, fill=255)
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


def head_replace_mask() -> Image.Image:
    # This is a hard export boundary, equivalent to a layer mask in a PSD.  A
    # hard mask is deliberate: alpha-blending complementary masks creates a
    # translucent seam.  The curved head region removes stray generated hair;
    # the tapered lower region fixes the neck while leaving each outfit's pose
    # and shoulders intact.
    return geometric_mask(
        rectangles=[(0, 0, CANVAS[0], 302)],
        ellipses=[(304, -28, 720, 520)],
        polygons=[[(382, 300), (642, 300), (624, 470), (582, 585), (442, 585), (400, 470)]],
        blur=0,
    )


def fixed_size_transform(crop: Image.Image, *, scale_x: float, scale_y: float, mirror: bool = False) -> Image.Image:
    if mirror:
        crop = ImageOps.mirror(crop)
    width, height = crop.size
    transformed = crop.resize(
        (max(1, round(width * scale_x)), max(1, round(height * scale_y))),
        Image.Resampling.LANCZOS,
    )
    frame = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    left = (width - transformed.width) // 2
    top = (height - transformed.height) // 2
    frame.alpha_composite(transformed, (left, top))
    return frame


def feathered_patch(base: Image.Image, box: tuple[int, int, int, int], *, scale_x: float, scale_y: float, contrast=1.0) -> Image.Image:
    crop = base.crop(box)
    transformed = fixed_size_transform(crop, scale_x=scale_x, scale_y=scale_y)
    if contrast != 1.0:
        rgb = ImageEnhance.Contrast(transformed.convert("RGB")).enhance(contrast)
        rgb.putalpha(transformed.getchannel("A"))
        transformed = rgb
    width, height = crop.size
    local_mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(local_mask).rounded_rectangle((4, 4, width - 5, height - 5), radius=max(8, height // 4), fill=255)
    local_mask = local_mask.filter(ImageFilter.GaussianBlur(5))
    local_mask = ImageChops.multiply(local_mask, transformed.getchannel("A"))
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    transformed.putalpha(local_mask)
    layer.alpha_composite(transformed, (box[0], box[1]))
    return layer


def replace_region(base: Image.Image, box: tuple[int, int, int, int], *, mirror=False, scale_x=1.0, scale_y=1.0) -> Image.Image:
    crop = base.crop(box)
    transformed = fixed_size_transform(crop, scale_x=scale_x, scale_y=scale_y, mirror=mirror)
    patch = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    patch.alpha_composite(transformed, (box[0], box[1]))
    mask = geometric_mask(rectangles=[box], blur=4)
    return Image.composite(patch, base, mask)


def hair_alpha(image: Image.Image, region: Image.Image) -> Image.Image:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32)
    rgb = data[:, :, :3]
    alpha = data[:, :, 3] / 255.0
    value = rgb.mean(axis=2)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    dark = np.clip((148.0 - value) / 70.0, 0.0, 1.0)
    neutral = np.clip((80.0 - spread) / 50.0, 0.0, 1.0)
    derived = Image.fromarray(np.uint8(dark * neutral * alpha * 255.0), "L")
    return ImageChops.multiply(derived, region).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.0))


def back_hair_extension(base: Image.Image, body: str) -> Image.Image:
    region = geometric_mask(
        ellipses=[(318, 58, 706, 390)],
        polygons=[[(326, 220), (698, 220), (704, 374), (320, 374)]],
    )
    face_cut = geometric_mask(ellipses=[(374, 158, 650, 520)], blur=2)
    hair = ImageChops.subtract(hair_alpha(base, region), face_cut)
    source = alpha_layer(base, hair)
    bbox = source.getchannel("A").getbbox()
    if not bbox:
        return Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    crop = source.crop(bbox).resize(
        (round((bbox[2] - bbox[0]) * 1.06), round((bbox[3] - bbox[1]) * (1.26 if body == "male" else 1.18))),
        Image.Resampling.LANCZOS,
    )
    extension = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    extension.alpha_composite(crop, (round(512 - crop.width / 2) + (9 if body == "male" else -7), bbox[1] + 88))
    return extension


def build_heads(canonical: Image.Image, body: str) -> dict[tuple[int, int], Image.Image]:
    front_changed = replace_region(canonical, (350, 58, 674, 292), mirror=True, scale_x=1.03, scale_y=1.02)
    # Restore the canonical face below the hairline so the front-hair option
    # cannot move eyes, brows, nose, mouth, jaw or skin shading.
    face_protect = geometric_mask(ellipses=[(378, 236, 646, 520)], blur=3)
    front_changed = Image.composite(canonical, front_changed, face_protect)
    extension = back_hair_extension(canonical, body)
    core_mask = head_replace_mask()
    base_head = alpha_layer(canonical, core_mask)
    front_head = alpha_layer(front_changed, core_mask)
    return {
        (1, 1): base_head,
        (2, 1): front_head,
        (1, 2): Image.alpha_composite(extension, base_head),
        (2, 2): Image.alpha_composite(extension, front_head),
    }


def compile_base(clothing: Image.Image, head: Image.Image, extension: Image.Image) -> Image.Image:
    # Image.composite replaces pixels instead of alpha-compositing them.  Thus
    # transparent pixels around the canonical silhouette also erase any stray
    # hair from the clothing source, exactly like exporting a masked PSD group.
    result = Image.composite(head, clothing, head_replace_mask())
    if extension.getchannel("A").getbbox():
        result.alpha_composite(extension)
    return result


def place_crown(crown_source: Image.Image, body: str) -> Image.Image:
    crown = remove_magenta_key(crown_source)
    bbox = crown.getchannel("A").getbbox()
    crown = crown.crop(bbox)
    target_width = 188 if body == "male" else 176
    target_height = round(crown.height * target_width / crown.width)
    crown = crown.resize((target_width, target_height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(crown, (round(512 - target_width / 2), 72 if body == "male" else 79))
    return canvas


def accessory_layers(body: str, crown_source: Image.Image) -> dict[str, Image.Image]:
    face = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(face, "RGBA")
    if body == "male":
        draw.line((574, 326, 606, 374), fill=(91, 43, 39, 205), width=7)
        draw.line((578, 328, 606, 369), fill=(229, 168, 136, 120), width=3)
    else:
        for x, y in ((442, 345), (454, 354), (466, 348), (568, 352), (582, 345), (594, 353)):
            draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(105, 61, 46, 195))
    face = face.filter(ImageFilter.GaussianBlur(0.45))

    # Keep the existing restrained scabbard silhouette, but place it entirely
    # behind the clothing and fixed head layers.
    sword = Image.new("RGBA", (150, 1030), (0, 0, 0, 0))
    sword_draw = ImageDraw.Draw(sword, "RGBA")
    sword_draw.rounded_rectangle((58, 126, 96, 968), radius=17, fill=(39, 31, 28, 235), outline=(139, 101, 57, 220), width=5)
    sword_draw.polygon([(58, 952), (96, 952), (77, 1015)], fill=(32, 27, 25, 238), outline=(156, 114, 64, 218))
    sword_draw.rounded_rectangle((62, 32, 92, 150), radius=11, fill=(52, 43, 37, 240), outline=(190, 144, 74, 220), width=4)
    sword_draw.line((48, 126, 108, 126), fill=(204, 158, 84, 225), width=9)
    sword = sword.rotate(9 if body == "male" else 7, Image.Resampling.BICUBIC, expand=True)
    back = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    back.alpha_composite(sword, (650 if body == "male" else 660, 220))

    return {
        "hat-2": place_crown(crown_source, body),
        "face-accessory-2": face,
        "back-accessory-2": back,
    }


def build_body(body: str, master_dir: Path, outfit_dir: Path, crown_source: Image.Image, output_dir: Path) -> dict[str, Image.Image]:
    canonical = normalize_portrait(remove_magenta_key(Image.open(master_dir / f"{body}-look-1-chroma.png")))
    outfit_two = normalize_portrait(remove_magenta_key(Image.open(outfit_dir / f"{body}-outfit-2-chroma.png")))
    clothing = {1: canonical, 2: outfit_two}
    assets: dict[str, Image.Image] = {}
    heads = build_heads(canonical, body)
    empty = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    for clothing_option, clothing_image in clothing.items():
        assets[f"base-c{clothing_option}"] = compile_base(clothing_image, canonical, empty)
    for (front, back), head in heads.items():
        assets[f"head-f{front}-b{back}"] = head

    feature_settings = {
        "face-shape": (1.035, 1.0, 1.0),
        "eyes": (1.075, 0.94, 1.04),
        "brows": (1.035, 1.12, 1.08),
        "nose": (1.06, 1.04, 1.03),
        "mouth": (1.12, 0.96, 1.06),
    }
    for part, (scale_x, scale_y, contrast) in feature_settings.items():
        assets[f"{part}-2"] = feathered_patch(
            canonical,
            FEATURE_BOXES[part],
            scale_x=scale_x,
            scale_y=scale_y,
            contrast=contrast,
        )

    assets.update(accessory_layers(body, crown_source))
    for key, image in assets.items():
        save_webp(
            image,
            output_dir / f"{body}-{key}-v1.webp",
            lossless=(key.startswith("head-") or "accessory" in key or "hat" in key),
        )
    return assets


def render_preview(assets: dict[str, Image.Image], selected: dict[str, int]) -> Image.Image:
    clothing = selected.get("clothing", 1)
    front = selected.get("frontHair", 1)
    back = selected.get("backHair", 1)
    result = assets[f"base-c{clothing}"].copy()
    result.alpha_composite(assets[f"head-f{front}-b{back}"])
    state_keys = {
        "face-shape": "faceShape",
        "eyes": "eyes",
        "brows": "brows",
        "nose": "nose",
        "mouth": "mouth",
    }
    for part in FEATURE_PARTS:
        if selected.get(state_keys[part], 1) == 2:
            result.alpha_composite(assets[f"{part}-2"])
    if selected.get("faceAccessory") == 2:
        result.alpha_composite(assets["face-accessory-2"])
    if selected.get("hat") == 2:
        result.alpha_composite(assets["hat-2"])
    if selected.get("backAccessory") == 2:
        behind = assets["back-accessory-2"].copy()
        behind.alpha_composite(result)
        result = behind
    return result


def validate_fixed_head(assets: dict[str, Image.Image]) -> None:
    first = render_preview(assets, {"clothing": 1})
    second = render_preview(assets, {"clothing": 2})
    head = assets["head-f1-b1"].getchannel("A")
    a = np.asarray(first.convert("RGBA"))
    b = np.asarray(second.convert("RGBA"))
    mask = np.asarray(head) >= 250
    if not np.array_equal(a[mask], b[mask]):
        raise SystemExit("clothing options changed canonical head pixels")

    allowed = {
        "face-shape": (366, 160, 658, 522),
        "eyes": (382, 266, 642, 368),
        "brows": (380, 228, 644, 319),
        "nose": (452, 288, 572, 422),
        "mouth": (422, 376, 602, 466),
    }
    for part, box in allowed.items():
        bbox = assets[f"{part}-2"].getchannel("A").getbbox()
        if not bbox or bbox[0] < box[0] or bbox[1] < box[1] or bbox[2] > box[2] or bbox[3] > box[3]:
            raise SystemExit(f"{part} escaped fixed facial ROI: {bbox} not within {box}")


def build_qa(all_assets: dict[str, dict[str, Image.Image]], target: Path) -> None:
    presets = (
        {"clothing": 1},
        {"clothing": 2},
        {"clothing": 1, "frontHair": 2, "backHair": 2, "faceShape": 2, "eyes": 2, "brows": 2, "nose": 2, "mouth": 2},
        {"clothing": 2, "frontHair": 2, "backHair": 2, "faceShape": 2, "eyes": 2, "brows": 2, "nose": 2, "mouth": 2, "hat": 2, "faceAccessory": 2, "backAccessory": 2},
    )
    tile = (384, 576)
    matrix = Image.new("RGB", (tile[0] * 4, tile[1] * 2), (239, 235, 222))
    draw = ImageDraw.Draw(matrix)
    for row, body in enumerate(BODIES):
        for column, preset in enumerate(presets):
            preview = render_preview(all_assets[body], preset)
            preview.thumbnail((tile[0], tile[1] - 28), Image.Resampling.LANCZOS)
            left, top = column * tile[0], row * tile[1]
            matrix.paste(preview, (left + (tile[0] - preview.width) // 2, top + 28), preview)
            draw.text((left + 10, top + 8), f"{body} / fixed-anchor {column + 1}", fill=(47, 75, 76))
            draw.rectangle((left, top, left + tile[0] - 1, top + tile[1] - 1), outline=(155, 128, 75))
    target.parent.mkdir(parents=True, exist_ok=True)
    matrix.save(target, "WEBP", quality=93, method=6)


def validate_files(output_dir: Path) -> None:
    expected_keys = {
        "base-c1", "base-c2",
        *[f"head-f{front}-b{back}" for front in (1, 2) for back in (1, 2)],
        *[f"{part}-2" for part in FEATURE_PARTS],
        "hat-2", "face-accessory-2", "back-accessory-2",
    }
    expected = {f"{body}-{key}-v1.webp" for body in BODIES for key in expected_keys}
    actual = {path.name for path in output_dir.glob("*.webp")}
    if actual != expected:
        raise SystemExit(f"appearance rig v5 mismatch: missing={sorted(expected - actual)} extra={sorted(actual - expected)}")
    for path in output_dir.glob("*.webp"):
        image = Image.open(path).convert("RGBA")
        if image.size != CANVAS or not image.getchannel("A").getbbox():
            raise SystemExit(f"invalid fixed-canvas appearance asset: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the fixed-anchor layered appearance rig v5.")
    parser.add_argument("--master-dir", type=Path, default=Path("art_source/appearance/rig-v3"))
    parser.add_argument("--outfit-dir", type=Path, default=Path("art_source/appearance/rig-v4"))
    parser.add_argument("--source-dir", type=Path, default=Path("art_source/appearance/rig-v5"))
    parser.add_argument("--output-dir", type=Path, default=Path("web/assets/appearance/rig-v5-psd"))
    parser.add_argument("--qa-output", type=Path, default=Path("docs/assets/appearance-rig-v5-psd-matrix.webp"))
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    crown_source = Image.open(args.source_dir / "ebony-guan-chroma.png")
    all_assets = {
        body: build_body(body, args.master_dir, args.outfit_dir, crown_source, args.output_dir)
        for body in BODIES
    }
    for assets in all_assets.values():
        validate_fixed_head(assets)
    validate_files(args.output_dir)
    build_qa(all_assets, args.qa_output)
    print(f"appearance rig v5 built: {len(list(args.output_dir.glob('*.webp')))} assets")


if __name__ == "__main__":
    main()
