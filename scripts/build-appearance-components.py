"""Build aligned transparent paper-doll components from approved full-look sources.

The source directory must contain male-1.png .. male-8.png and
female-1.png .. female-8.png after chroma-key removal.  Every output keeps the
shared 1024x1536 canvas so the browser can stack parts without per-item offsets.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter


CANVAS = (1024, 1536)
TARGET_FACE_ANCHOR = (512, 332)
PART_COUNTS = {
    "hat": 8,
    "frontHair": 8,
    "backHair": 8,
    "eyes": 8,
    "brows": 8,
    "mouth": 8,
    "nose": 8,
    "faceShape": 6,
    "faceAccessory": 6,
    "backAccessory": 6,
    "clothing": 8,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--hair-dir", type=Path)
    parser.add_argument("--face-master-dir", type=Path)
    parser.add_argument("--clothing-dir", type=Path)
    parser.add_argument("--headwear-dir", type=Path)
    parser.add_argument("--component-dir", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--qa-out", type=Path)
    parser.add_argument("--qa-only", action="store_true")
    parser.add_argument("--hair-only", action="store_true")
    parser.add_argument("--faces-only", action="store_true")
    parser.add_argument("--clothing-only", action="store_true")
    parser.add_argument("--hats-only", action="store_true")
    parser.add_argument("--components-only", action="store_true")
    parser.add_argument("--skip-validation", action="store_true")
    return parser.parse_args()


def shape_mask(*, rectangles=(), ellipses=(), polygons=(), blur=0) -> Image.Image:
    mask = Image.new("L", CANVAS, 0)
    draw = ImageDraw.Draw(mask)
    for box in rectangles:
        draw.rectangle(box, fill=255)
    for box in ellipses:
        draw.ellipse(box, fill=255)
    for points in polygons:
        draw.polygon(points, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(blur)) if blur else mask


def skin_mask(image: Image.Image) -> np.ndarray:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32)
    red, green, blue, alpha = (data[:, :, index] for index in range(4))
    return (
        (alpha > 180)
        & (red > 95)
        & (red > green * 1.03)
        & (green > blue * 0.92)
        & ((red - blue) > 18)
    )


def align_source(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    skin = skin_mask(image)
    yy, xx = np.indices((CANVAS[1], CANVAS[0]))
    roi = skin & (xx > 420) & (xx < 605) & (yy > 145) & (yy < 345)
    ys, xs = np.where(roi)
    if len(xs) < 100:
        return image
    anchor_x = int(np.median(xs))
    anchor_y = int(np.quantile(ys, 0.95))
    offset = (TARGET_FACE_ANCHOR[0] - anchor_x, TARGET_FACE_ANCHOR[1] - anchor_y)
    aligned = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    aligned.alpha_composite(image, offset)
    return aligned


def multiply_alpha(image: Image.Image, mask: Image.Image) -> Image.Image:
    result = image.copy()
    result.putalpha(ImageChops.multiply(image.getchannel("A"), mask))
    return result


def subtract_mask(mask: Image.Image, removal: Image.Image) -> Image.Image:
    return ImageChops.subtract(mask, removal)


def dark_hair_mask(image: Image.Image, region: Image.Image, *, back: bool, index: int, clean_sheet: bool = False) -> Image.Image:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32)
    rgb = data[:, :, :3]
    alpha = data[:, :, 3] / 255
    value = rgb.mean(axis=2)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    hair = np.clip((142 - value) / 62, 0, 1) * np.clip((58 - spread) / 34, 0, 1) * alpha
    hair = Image.fromarray(np.uint8(hair * 255), "L")
    hair = ImageChops.multiply(hair, region)
    if back:
        face_cut = shape_mask(ellipses=[(432, 168, 592, 360)], blur=4)
        hair = subtract_mask(hair, face_cut)
    else:
        lower_face_cut = shape_mask(ellipses=[(438, 205, 588, 390)], blur=3)
        hair = subtract_mask(hair, lower_face_cut)
    if clean_sheet:
        return hair.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.65))
    if index in {5, 7}:
        hat_cut = shape_mask(rectangles=[(275, 70, 750, 238)], blur=2)
        hair = subtract_mask(hair, hat_cut)
    elif index == 6:
        hood_cut = shape_mask(polygons=[[(350, 80), (674, 80), (642, 218), (382, 218)]], blur=2)
        hair = subtract_mask(hair, hood_cut)
    elif index == 8:
        cap_cut = shape_mask(rectangles=[(392, 72, 632, 220)], blur=2)
        hair = subtract_mask(hair, cap_cut)
    return hair.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.65))


def hair_sheet_layers(body: str, hair_dir: Path) -> dict[tuple[str, int], Image.Image]:
    sheet = Image.open(hair_dir / f"{body}-hair-sheet.png").convert("RGBA")
    layers: dict[tuple[str, int], Image.Image] = {}
    for index in range(1, 9):
        column = (index - 1) % 4
        row = (index - 1) // 4
        panel = sheet.crop((column * 384, row * 512, (column + 1) * 384, (row + 1) * 512))
        aligned = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        aligned.alpha_composite(panel, (320, 0))
        head_region = shape_mask(ellipses=[(330, 30, 700, 610)], blur=2)
        torso_cut = shape_mask(polygons=[[(320, 350), (704, 350), (760, 650), (264, 650)]], blur=4)
        head_region = subtract_mask(head_region, torso_cut)
        front_region = shape_mask(ellipses=[(375, 35, 650, 390)], blur=2)
        front_region = subtract_mask(front_region, shape_mask(rectangles=[(320, 355, 704, 540)], blur=3))
        for kind, region, back in (("backHair", head_region, True), ("frontHair", front_region, False)):
            layer = multiply_alpha(aligned, dark_hair_mask(aligned, region, back=back, index=index, clean_sheet=True))
            layers[(kind, index)] = layer
        feature_masks = {
            "faceShape": shape_mask(ellipses=[(423, 145, 601, 360)], polygons=[[(465, 310), (558, 310), (570, 415), (454, 415)]], blur=4),
            "eyes": shape_mask(ellipses=[(440, 202, 510, 260), (510, 202, 580, 260)], blur=3),
            "brows": shape_mask(ellipses=[(438, 182, 512, 228), (508, 182, 582, 228)], blur=3),
            "nose": shape_mask(ellipses=[(478, 218, 546, 298)], blur=3),
            "mouth": shape_mask(ellipses=[(462, 272, 562, 330)], blur=3),
        }
        face_layer = multiply_alpha(aligned, feature_masks["faceShape"])
        feature_erase = Image.new("L", CANVAS, 0)
        for kind in ("eyes", "brows", "nose", "mouth"):
            feature_erase = ImageChops.lighter(feature_erase, feature_masks[kind])
        smoothed_face = multiply_alpha(aligned.filter(ImageFilter.GaussianBlur(14)), feature_masks["faceShape"])
        face_layer = Image.composite(smoothed_face, face_layer, feature_erase)
        for kind in ("eyes", "brows", "nose", "mouth"):
            layers[(kind, index)] = multiply_alpha(aligned, feature_masks[kind])
        if index <= 6:
            layers[("faceShape", index)] = face_layer
    layers.update(clean_face_layers(body, sheet))
    return layers


def transform_component(layer: Image.Image, x_scale: float, y_scale: float, shift_x: int = 0, shift_y: int = 0) -> Image.Image:
    bbox = layer.getchannel("A").getbbox()
    if not bbox:
        return layer
    subject = layer.crop(bbox)
    width = max(1, round(subject.width * x_scale))
    height = max(1, round(subject.height * y_scale))
    subject = subject.resize((width, height), Image.Resampling.LANCZOS)
    center_x = (bbox[0] + bbox[2]) // 2 + shift_x
    center_y = (bbox[1] + bbox[3]) // 2 + shift_y
    result = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    result.alpha_composite(subject, (center_x - width // 2, center_y - height // 2))
    return result


def feature_detail_layer(source: Image.Image, region: Image.Image, kind: str) -> Image.Image:
    """Keep painted facial strokes without carrying a rectangular skin patch.

    The old implementation copied an oval of skin around every feature.  Those
    ovals only disappeared for the exact source face and produced bright seams
    as soon as another face shape or feature was selected.  Here alpha comes
    from local tonal detail instead, so eyes, brows, nose and mouth remain
    brushwork laid over one shared skin surface.
    """
    original = np.asarray(source.convert("RGBA"), dtype=np.float32)
    softened = np.asarray(source.filter(ImageFilter.GaussianBlur(7)).convert("RGBA"), dtype=np.float32)
    color_delta = np.max(np.abs(original[:, :, :3] - softened[:, :, :3]), axis=2)
    darkness = np.mean(softened[:, :, :3] - original[:, :, :3], axis=2)
    if kind in {"eyes", "brows", "mouth"}:
        strength = np.maximum(color_delta * 5.4, darkness * 11.0)
    else:
        strength = np.maximum(color_delta * 5.0, np.abs(darkness) * 8.0)
    strength = np.clip(strength - 13, 0, 255)
    region_alpha = np.asarray(region, dtype=np.float32) / 255
    source_alpha = original[:, :, 3] / 255
    alpha = np.uint8(np.clip(strength * region_alpha * source_alpha, 0, 255))
    alpha_image = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.55))
    result = source.copy()
    result.putalpha(alpha_image)
    return result


def clean_face_layers(body: str, sheet: Image.Image) -> dict[tuple[str, int], Image.Image]:
    panel = sheet if sheet.size == (384, 512) else sheet.crop((384, 512, 768, 1024))
    aligned = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    aligned.alpha_composite(panel, (320, 20 if body == "male" else 0))
    aligned = align_source(aligned)
    masks = {
        "faceShape": shape_mask(ellipses=[(416, 112, 614, 318)], polygons=[[(448, 255), (576, 255), (604, 420), (420, 420)]], blur=3),
        "eyes": shape_mask(ellipses=[(438, 170, 511, 221), (509, 170, 582, 221)], blur=3),
        "brows": shape_mask(ellipses=[(436, 146, 513, 190), (507, 146, 584, 190)], blur=3),
        "nose": shape_mask(ellipses=[(480, 187, 544, 248)], blur=3),
        "mouth": shape_mask(ellipses=[(464, 220, 560, 272)], blur=3),
    }
    detected_skin = Image.fromarray(np.uint8(skin_mask(aligned) * 255), "L")
    detected_skin = detected_skin.filter(ImageFilter.MaxFilter(17)).filter(ImageFilter.MinFilter(17))
    detected_skin = detected_skin.filter(ImageFilter.GaussianBlur(1.35))
    face_alpha = ImageChops.multiply(masks["faceShape"], detected_skin)
    feature_erase = Image.new("L", CANVAS, 0)
    for kind in ("eyes", "brows", "nose", "mouth"):
        feature_erase = ImageChops.lighter(feature_erase, masks[kind])
    smooth = aligned.filter(ImageFilter.GaussianBlur(12))
    face = Image.composite(smooth, aligned, feature_erase)
    face = multiply_alpha(face, face_alpha)
    layers: dict[tuple[str, int], Image.Image] = {}
    face_transforms = [
        (1.00, 1.00, 0, 0), (1.05, 0.99, 0, 0), (0.94, 1.04, 0, 1),
        (1.08, 0.96, 0, -1), (0.97, 1.05, 0, 1), (1.11, 0.98, 0, 0),
    ]
    for index, transform in enumerate(face_transforms, start=1):
        layers[("faceShape", index)] = transform_component(face, *transform)
    feature_transforms = {
        "eyes": [(1, 1, 0, 0), (.94, 1.08, 0, 1), (1.07, .94, 0, -1), (.98, 1.12, 0, 0), (1.1, .9, 0, 0), (.91, 1.02, 0, 1), (1.04, 1.05, 0, -1), (.97, .92, 0, 1)],
        "brows": [(1, 1, 0, 0), (1.03, .9, 0, 2), (.94, 1.08, 0, -1), (1.08, .92, 0, 1), (.9, 1.05, 0, -2), (1.04, 1, 0, 0), (.97, .88, 0, 2), (1.1, 1.06, 0, -1)],
        "nose": [(1, 1, 0, 0), (.92, 1.06, 0, 0), (1.08, .96, 0, 0), (.96, .91, 0, -1), (1.04, 1.1, 0, 1), (.9, 1, 0, 0), (1.1, 1.04, 0, 0), (.98, .94, 0, -1)],
        "mouth": [(1, 1, 0, 0), (.92, .96, 0, 0), (1.08, 1.04, 0, 0), (.96, .9, 0, 1), (1.04, 1.08, 0, -1), (.9, 1.02, 0, 0), (1.1, .94, 0, 1), (.98, 1.1, 0, -1)],
    }
    for kind, transforms in feature_transforms.items():
        base = feature_detail_layer(aligned, masks[kind], kind)
        for index, transform in enumerate(transforms, start=1):
            layers[(kind, index)] = transform_component(base, *transform)
    return layers


def clothing_sheet_layers(body: str, clothing_dir: Path) -> dict[tuple[str, int], Image.Image]:
    sheet = Image.open(clothing_dir / f"{body}-clothing-sheet.png").convert("RGBA")
    layers: dict[tuple[str, int], Image.Image] = {}
    for index in range(1, 9):
        column = (index - 1) % 4
        row = (index - 1) // 4
        panel = sheet.crop((column * 384, row * 512, (column + 1) * 384, (row + 1) * 512))
        bbox = panel.getchannel("A").getbbox()
        if not bbox:
            raise SystemExit(f"empty clothing panel: {body}-{index}")
        subject = panel.crop(bbox)
        target_height = 1340
        target_width = max(1, round(subject.width * target_height / subject.height))
        subject = subject.resize((target_width, target_height), Image.Resampling.LANCZOS)
        aligned = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        aligned.alpha_composite(subject, ((CANVAS[0] - target_width) // 2, 1445 - target_height))
        head_cut = shape_mask(ellipses=[(402, 68, 622, 370)], blur=4)
        layer = multiply_alpha(aligned, ImageChops.invert(head_cut))
        layers[("clothing", index)] = layer
    return layers


def hat_layers(body: str, source_dir: Path) -> dict[tuple[str, int], Image.Image]:
    layers = {}
    for index in range(2, 9):
        source = align_source(Image.open(source_dir / f"{body}-{index}.png"))
        layers[("hat", index)] = multiply_alpha(source, hat_mask(index))
    return layers


def headwear_sheet_layers(body: str, headwear_dir: Path) -> dict[tuple[str, int], Image.Image]:
    sheet = Image.open(headwear_dir / "headwear-sheet.png").convert("RGBA")
    specs = {
        2: (250, 195),
        3: (178, 174),
        4: (224, 178),
        5: (468, 214),
        6: (372, 398),
        7: (452, 180),
        8: (232, 175),
    }
    body_scale = 1.02 if body == "male" else 0.96
    layers: dict[tuple[str, int], Image.Image] = {}
    for index in range(2, 9):
        panel_index = index - 2
        column = panel_index % 4
        row = panel_index // 4
        panel = sheet.crop((column * 384, row * 512, (column + 1) * 384, (row + 1) * 512))
        bbox = panel.getchannel("A").getbbox()
        if not bbox:
            raise SystemExit(f"empty headwear panel: {index}")
        subject = panel.crop(bbox)
        target_width, bottom = specs[index]
        target_width = round(target_width * body_scale)
        target_height = max(1, round(subject.height * target_width / subject.width))
        subject = subject.resize((target_width, target_height), Image.Resampling.LANCZOS)
        aligned = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        aligned.alpha_composite(subject, ((CANVAS[0] - target_width) // 2, bottom - target_height))
        layers[("hat", index)] = aligned
    return layers


def component_sheet_layer(sheet: Image.Image, index: int, columns: int, rows: int, target_width: int, top: int) -> Image.Image:
    panel_width = sheet.width / columns
    panel_height = sheet.height / rows
    column = index % columns
    row = index // columns
    panel = sheet.crop((
        round(column * panel_width),
        round(row * panel_height),
        round((column + 1) * panel_width),
        round((row + 1) * panel_height),
    ))
    bbox = panel.getchannel("A").getbbox()
    if not bbox:
        raise SystemExit(f"empty component panel: {index}")
    subject = panel.crop(bbox)
    target_height = max(1, round(subject.height * target_width / subject.width))
    subject = subject.resize((target_width, target_height), Image.Resampling.LANCZOS)
    aligned = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    aligned.alpha_composite(subject, ((CANVAS[0] - target_width) // 2, top))
    return aligned


def specialized_component_layers(body: str, component_dir: Path) -> dict[tuple[str, int], Image.Image]:
    scale = 1.02 if body == "male" else 0.96
    front_sheet = Image.open(component_dir / "front-hair-components.png").convert("RGBA")
    back_sheet = Image.open(component_dir / "back-hair-components.png").convert("RGBA")
    back_accessory_sheet = Image.open(component_dir / "back-accessory-components.png").convert("RGBA")
    layers: dict[tuple[str, int], Image.Image] = {}
    for index in range(1, 9):
        front_layer = component_sheet_layer(
            front_sheet, index - 1, 4, 2, round(260 * scale), 28,
        )
        face_clear = shape_mask(ellipses=[(425, 205, 599, 395)], blur=3)
        front_layer = multiply_alpha(front_layer, ImageChops.invert(face_clear))
        layers[("frontHair", index)] = front_layer
        layers[("backHair", index)] = component_sheet_layer(
            back_sheet, index - 1, 4, 2, round(286 * scale), 48,
        )
    accessory_specs = {
        2: (235, 155),
        3: (210, 250),
        4: (205, 180),
        5: (600, 248),
        6: (230, 135),
    }
    accessory_ranges = {
        2: (18, 312),
        3: (326, 622),
        4: (636, 934),
        5: (914, 1250),
        6: (1240, 1536),
    }
    for index in range(2, 7):
        target_width, top = accessory_specs[index]
        left, right = accessory_ranges[index]
        panel = back_accessory_sheet.crop((left, 0, right, back_accessory_sheet.height))
        bbox = panel.getchannel("A").getbbox()
        if not bbox:
            raise SystemExit(f"empty back accessory panel: {index}")
        subject = panel.crop(bbox)
        width = round(target_width * scale)
        height = max(1, round(subject.height * width / subject.width))
        subject = subject.resize((width, height), Image.Resampling.LANCZOS)
        layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        layer.alpha_composite(subject, ((CANVAS[0] - width) // 2, top))
        if index in {2, 3, 4, 6}:
            offset_x = 118 if index != 3 else 96
            shifted = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
            shifted.alpha_composite(layer, (offset_x, 0))
            layer = shifted
        layers[("backAccessory", index)] = layer
    for index in range(2, 7):
        layers[("faceAccessory", index)] = drawn_face_accessory(index)
    return layers


def drawn_face_accessory(index: int) -> Image.Image:
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    if index == 2:
        draw.line([(552, 207), (570, 224), (562, 245)], fill=(126, 61, 49, 220), width=4)
        draw.line([(548, 212), (566, 229)], fill=(205, 133, 105, 150), width=2)
    elif index == 3:
        draw.ellipse((550, 215, 557, 222), fill=(66, 45, 38, 235))
    elif index == 4:
        color = (41, 78, 83, 225)
        draw.line([(462, 184), (478, 197), (463, 211)], fill=color, width=5)
        draw.line([(469, 179), (486, 193), (472, 220)], fill=color, width=3)
    elif index == 5:
        draw.line([(426, 166), (590, 197)], fill=(24, 31, 34, 230), width=6)
        draw.polygon([(515, 166), (582, 177), (574, 227), (515, 217)], fill=(24, 31, 34, 245))
        draw.line([(520, 173), (574, 182)], fill=(75, 86, 87, 180), width=3)
    elif index == 6:
        draw.line([(461, 184), (490, 231)], fill=(134, 66, 55, 220), width=4)
        for x, y in ((468, 195), (474, 205), (480, 215), (486, 225)):
            draw.line([(x - 5, y + 3), (x + 5, y - 3)], fill=(204, 139, 111, 210), width=2)
    return layer.filter(ImageFilter.GaussianBlur(0.45))


def warm_object_mask(image: Image.Image, region: Image.Image) -> Image.Image:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32)
    red, green, blue, alpha = (data[:, :, index] for index in range(4))
    warm = (
        (alpha > 12)
        & (red > 75)
        & (red > green * 1.08)
        & (green > blue * 1.08)
        & ((red - blue) > 20)
    )
    mask = Image.fromarray(np.uint8(warm) * 255, "L")
    return ImageChops.multiply(mask.filter(ImageFilter.MaxFilter(13)), region).filter(ImageFilter.GaussianBlur(1.2))


def component_masks(image: Image.Image, index: int) -> dict[str, Image.Image]:
    head_region = shape_mask(ellipses=[(340, 55, 690, 565)], blur=2)
    front_region = shape_mask(ellipses=[(385, 90, 640, 455)], blur=2)
    masks = {
        "backHair": dark_hair_mask(image, head_region, back=True, index=index),
        "frontHair": dark_hair_mask(image, front_region, back=False, index=index),
        "faceShape": shape_mask(ellipses=[(423, 160, 601, 365)], polygons=[[(465, 315), (558, 315), (570, 410), (454, 410)]], blur=4),
        "eyes": shape_mask(ellipses=[(444, 228, 508, 302), (512, 228, 576, 302)], blur=5),
        "brows": shape_mask(ellipses=[(440, 208, 510, 272), (510, 208, 580, 272)], blur=5),
        "nose": shape_mask(ellipses=[(476, 242, 548, 329)], blur=5),
        "mouth": shape_mask(ellipses=[(458, 286, 566, 355)], blur=5),
    }

    clothing = shape_mask(
        polygons=[[(315, 315), (709, 315), (784, 690), (766, 1460), (258, 1460), (240, 690)]],
        ellipses=[(270, 300, 754, 860)],
        blur=2,
    )
    head_cut = shape_mask(ellipses=[(385, 80, 640, 420)], blur=3)
    clothing = subtract_mask(clothing, head_cut)
    if index in {2, 4, 7}:
        clothing = subtract_mask(clothing, shape_mask(rectangles=[(565, 105, 790, 610)], blur=3))
    if index in {3, 8}:
        gourd_zone = shape_mask(rectangles=[(260, 210, 760, 900)], blur=2)
        clothing = subtract_mask(clothing, warm_object_mask(image, gourd_zone))
    if index == 5:
        cloak_edges = shape_mask(polygons=[[(190, 270), (834, 270), (890, 1260), (134, 1260)]], blur=3)
        central_body = shape_mask(polygons=[[(310, 300), (714, 300), (740, 1280), (284, 1280)]], blur=4)
        clothing = ImageChops.add(clothing, ImageChops.multiply(cloak_edges, central_body))
    masks["clothing"] = clothing
    return masks


def hat_mask(index: int) -> Image.Image:
    boxes = {
        2: (370, 165, 660, 278),
        3: (414, 55, 610, 205),
        4: (370, 80, 655, 276),
        5: (260, 55, 770, 284),
        7: (260, 55, 770, 286),
        8: (380, 62, 644, 255),
    }
    if index == 6:
        return shape_mask(
            polygons=[[(330, 68), (694, 68), (690, 278), (650, 372), (590, 420), (512, 402), (434, 420), (374, 372), (334, 278)]],
            blur=6,
        )
    return shape_mask(rectangles=[boxes[index]], blur=2)


def accessory_layer(source: Image.Image, index: int, kind: str) -> Image.Image:
    if kind == "backAccessory":
        if index == 2:
            mask = shape_mask(rectangles=[(548, 105, 800, 670)], blur=2)
        elif index == 3:
            zone = shape_mask(rectangles=[(240, 150, 780, 900)], blur=2)
            mask = warm_object_mask(source, zone)
        elif index == 4:
            mask = shape_mask(rectangles=[(548, 105, 800, 650)], blur=2)
        elif index == 5:
            outside = shape_mask(polygons=[[(120, 220), (904, 220), (940, 1320), (84, 1320)]], blur=2)
            body = shape_mask(polygons=[[(330, 270), (694, 270), (750, 1260), (274, 1260)]], blur=5)
            mask = subtract_mask(outside, body)
        else:
            outside = shape_mask(rectangles=[(205, 70, 825, 920)], blur=2)
            body = shape_mask(polygons=[[(360, 260), (664, 260), (720, 880), (304, 880)]], blur=4)
            mask = subtract_mask(outside, body)
        return multiply_alpha(source, mask)

    if index == 2:
        mask = shape_mask(ellipses=[(520, 252, 592, 338)], blur=2)
        return multiply_alpha(source, mask)
    if index == 3:
        result = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        draw = ImageDraw.Draw(result)
        draw.ellipse((548, 268, 556, 276), fill=(62, 42, 34, 235))
        return result.filter(ImageFilter.GaussianBlur(0.45))
    if index == 4:
        mask = shape_mask(ellipses=[(466, 195, 558, 267)], blur=1)
        return multiply_alpha(source, mask)
    if index == 5:
        result = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        texture = source.crop((390, 120, 610, 300)).resize((90, 46), Image.Resampling.LANCZOS)
        patch_mask = Image.new("L", (90, 46), 0)
        ImageDraw.Draw(patch_mask).ellipse((4, 5, 74, 42), fill=245)
        texture.putalpha(ImageChops.multiply(texture.getchannel("A"), patch_mask.filter(ImageFilter.GaussianBlur(1))))
        result.alpha_composite(texture, (438, 245))
        draw = ImageDraw.Draw(result)
        draw.line((436, 250, 570, 282), fill=(45, 39, 36, 230), width=8)
        return result
    mask = shape_mask(ellipses=[(520, 248, 594, 342)], blur=2)
    return multiply_alpha(source, mask)


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    image.save(temporary, "WEBP", quality=88, method=4, exact=True)
    temporary.replace(path)


def save_transparent_anchor(path: Path) -> None:
    image = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    image.save(temporary, "WEBP", lossless=True, method=1, exact=True)
    temporary.replace(path)


def build_body(
    body: str,
    source_dir: Path,
    output_dir: Path,
    hair_dir: Path | None = None,
    clothing_dir: Path | None = None,
) -> dict[tuple[str, int], Image.Image]:
    sources = [None] + [align_source(Image.open(source_dir / f"{body}-{index}.png")) for index in range(1, 9)]
    rendered: dict[tuple[str, int], Image.Image] = {}
    for index in range(1, 9):
        source = sources[index]
        masks = component_masks(source, index)
        for part in ("frontHair", "backHair", "eyes", "brows", "mouth", "nose", "clothing"):
            layer = multiply_alpha(source, masks[part])
            rendered[(part, index)] = layer
            save_webp(layer, output_dir / f"{body}-{part}-{index}-v2.webp")
        if index <= 6:
            layer = multiply_alpha(source, masks["faceShape"])
            rendered[("faceShape", index)] = layer
            save_webp(layer, output_dir / f"{body}-faceShape-{index}-v2.webp")
        if index >= 2:
            layer = multiply_alpha(source, hat_mask(index))
            rendered[("hat", index)] = layer
            save_webp(layer, output_dir / f"{body}-hat-{index}-v2.webp")
        if 2 <= index <= 6:
            for kind in ("faceAccessory", "backAccessory"):
                layer = accessory_layer(source, index, kind)
                rendered[(kind, index)] = layer
                save_webp(layer, output_dir / f"{body}-{kind}-{index}-v2.webp")
    if hair_dir:
        for (kind, index), layer in hair_sheet_layers(body, hair_dir).items():
            rendered[(kind, index)] = layer
            save_webp(layer, output_dir / f"{body}-{kind}-{index}-v2.webp")
    if clothing_dir:
        for (kind, index), layer in clothing_sheet_layers(body, clothing_dir).items():
            rendered[(kind, index)] = layer
            save_webp(layer, output_dir / f"{body}-{kind}-{index}-v2.webp")
    save_transparent_anchor(output_dir / f"{body}-base-v3.webp")
    return rendered


def compose_sample(body: str, base: Image.Image, layers: dict[tuple[str, int], Image.Image], values: dict[str, int]) -> Image.Image:
    result = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    for part in ("backAccessory", "backHair"):
        if (part, values[part]) in layers:
            result.alpha_composite(layers[(part, values[part])])
    result.alpha_composite(base)
    for part in ("clothing", "faceShape", "eyes", "brows", "nose", "mouth", "frontHair", "faceAccessory", "hat"):
        if (part, values[part]) in layers:
            result.alpha_composite(layers[(part, values[part])])
    return result


def build_qa(output: Path, output_dir: Path, built: dict[str, dict[tuple[str, int], Image.Image]]) -> None:
    samples = [
        (1, 1, 1, 1, 1), (2, 7, 3, 5, 6), (5, 2, 6, 2, 4), (6, 8, 4, 6, 3),
        (7, 4, 2, 4, 8), (8, 5, 5, 3, 2), (3, 6, 1, 5, 7), (4, 3, 6, 2, 5),
    ]
    sheet = Image.new("RGB", (1600, 900), (19, 23, 24))
    for body_index, body in enumerate(("male", "female")):
        base = Image.open(output_dir / f"{body}-base-v3.webp").convert("RGBA")
        for index, (hat, hair, face, back, clothing) in enumerate(samples):
            values = {
                "hat": hat,
                "frontHair": hair,
                "backHair": ((hair + 2) % 8) + 1,
                "eyes": ((index + 3) % 8) + 1,
                "brows": ((index + 5) % 8) + 1,
                "nose": ((index + 1) % 8) + 1,
                "mouth": ((index + 6) % 8) + 1,
                "faceShape": face,
                "faceAccessory": 1 if index % 3 == 0 else ((index % 5) + 2),
                "backAccessory": back,
                "clothing": clothing,
            }
            composed = compose_sample(body, base, built[body], values)
            bbox = composed.getbbox() or (0, 0, 1024, 1536)
            crop = composed.crop((max(0, bbox[0] - 20), max(0, bbox[1] - 20), min(1024, bbox[2] + 20), min(1536, bbox[3] + 20)))
            crop.thumbnail((190, 410), Image.Resampling.LANCZOS)
            x = index * 200 + (200 - crop.width) // 2
            y = body_index * 450 + (430 - crop.height) // 2
            sheet.paste(crop, (x, y), crop)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, "PNG", optimize=True)


def validate(output_dir: Path) -> None:
    failures = []
    for body in ("male", "female"):
        for part, count in PART_COUNTS.items():
            start = 2 if part in {"hat", "faceAccessory", "backAccessory"} else 1
            for index in range(start, count + 1):
                path = output_dir / f"{body}-{part}-{index}-v2.webp"
                if not path.exists():
                    failures.append(f"missing {path.name}")
                    continue
                image = Image.open(path).convert("RGBA")
                if image.size != CANVAS:
                    failures.append(f"wrong canvas {path.name}: {image.size}")
                alpha = np.asarray(image.getchannel("A"))
                visible_pixels = np.count_nonzero(alpha > 12)
                if visible_pixels < 6:
                    failures.append(f"empty {path.name}")
                if part in {"eyes", "brows", "nose", "mouth"} and visible_pixels > 12000:
                    failures.append(f"facial feature carries a skin patch {path.name}: {visible_pixels}")
                if part == "faceShape":
                    bbox = image.getchannel("A").getbbox()
                    if bbox and abs((bbox[0] + bbox[2]) / 2 - CANVAS[0] / 2) > 14:
                        failures.append(f"face anchor is off center {path.name}: {bbox}")
                if any(alpha[y, x] > 0 for x, y in ((0, 0), (1023, 0), (0, 1535), (1023, 1535))):
                    failures.append(f"opaque corner {path.name}")
    if failures:
        raise SystemExit("\n".join(failures))


def load_built_layers(body: str, output_dir: Path) -> dict[tuple[str, int], Image.Image]:
    layers = {}
    for part, count in PART_COUNTS.items():
        start = 2 if part in {"hat", "faceAccessory", "backAccessory"} else 1
        for index in range(start, count + 1):
            path = output_dir / f"{body}-{part}-{index}-v2.webp"
            if path.exists():
                layers[(part, index)] = Image.open(path).convert("RGBA")
    return layers


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    if args.hair_only or args.faces_only or args.clothing_only or args.hats_only or args.components_only:
        if args.hair_only and not args.hair_dir:
            raise SystemExit("--hair-only requires --hair-dir")
        if args.faces_only and not (args.face_master_dir or args.hair_dir):
            raise SystemExit("--faces-only requires --face-master-dir or --hair-dir")
        if args.clothing_only and not args.clothing_dir:
            raise SystemExit("--clothing-only requires --clothing-dir")
        if args.components_only and not args.component_dir:
            raise SystemExit("--components-only requires --component-dir")
        for body in ("male", "female"):
            replacement_layers = {}
            if args.hair_only:
                replacement_layers.update(hair_sheet_layers(body, args.hair_dir))
            if args.faces_only:
                face_source = (
                    Image.open(args.face_master_dir / f"{body}-face-master-v1.webp").convert("RGBA")
                    if args.face_master_dir
                    else Image.open(args.hair_dir / f"{body}-hair-sheet.png").convert("RGBA")
                )
                replacement_layers.update(clean_face_layers(body, face_source))
            if args.clothing_only:
                replacement_layers.update(clothing_sheet_layers(body, args.clothing_dir))
            if args.hats_only:
                replacement_layers.update(
                    headwear_sheet_layers(body, args.headwear_dir)
                    if args.headwear_dir
                    else hat_layers(body, args.source_dir)
                )
            if args.components_only:
                replacement_layers.update(specialized_component_layers(body, args.component_dir))
            for (kind, index), layer in replacement_layers.items():
                save_webp(layer, args.output_dir / f"{body}-{kind}-{index}-v2.webp")
            save_transparent_anchor(args.output_dir / f"{body}-base-v3.webp")
        built = (
            {body: load_built_layers(body, args.output_dir) for body in ("male", "female")}
            if args.qa_out
            else {}
        )
    else:
        built = {
            body: load_built_layers(body, args.output_dir) if args.qa_only else build_body(
                body,
                args.source_dir,
                args.output_dir,
                args.hair_dir,
                args.clothing_dir,
            )
            for body in ("male", "female")
        }
    if not args.skip_validation:
        validate(args.output_dir)
    if args.qa_out:
        build_qa(args.qa_out, args.output_dir, built)
    print(f"built {sum(len(parts) for parts in built.values())} appearance layers")


if __name__ == "__main__":
    main()
