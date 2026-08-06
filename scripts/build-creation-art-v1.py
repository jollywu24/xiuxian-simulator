from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art_source" / "creation-v1"
OUTPUT = ROOT / "web" / "assets" / "creation-v1"
QA_OUTPUT = ROOT / "docs" / "assets" / "creation-art-v1-sheet.webp"

CARD_SIZE = (720, 960)
BACKGROUND_SIZE = (1672, 941)


def cover_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    source_ratio = image.width / image.height
    target_ratio = size[0] / size[1]
    if source_ratio > target_ratio:
        crop_width = round(image.height * target_ratio)
        left = (image.width - crop_width) // 2
        image = image.crop((left, 0, left + crop_width, image.height))
    elif source_ratio < target_ratio:
        crop_height = round(image.width / target_ratio)
        top = (image.height - crop_height) // 2
        image = image.crop((0, top, image.width, top + crop_height))
    return image.resize(size, Image.Resampling.LANCZOS)


def save_webp(image: Image.Image, path: Path, *, quality: int = 88) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, format="WEBP", quality=quality, method=6)


def build_assets() -> dict[str, Image.Image]:
    cards = {
        "origin-shen-branch-v1.webp": "origin-shen-branch-master.png",
        "origin-streetborn-v1.webp": "origin-streetborn-master.png",
        "origin-mystery-v1.webp": "origin-mystery-master.png",
    }
    built: dict[str, Image.Image] = {}
    for target_name, source_name in cards.items():
        image = cover_resize(Image.open(SOURCE / source_name).convert("RGB"), CARD_SIZE)
        save_webp(image, OUTPUT / target_name)
        built[target_name] = image

    background = cover_resize(
        Image.open(SOURCE / "appearance-jiangnan-master.png").convert("RGB"),
        BACKGROUND_SIZE,
    )
    save_webp(background, OUTPUT / "appearance-jiangnan-v1.webp", quality=90)
    built["appearance-jiangnan-v1.webp"] = background
    return built


def build_qa_sheet(built: dict[str, Image.Image]) -> None:
    canvas = Image.new("RGB", (1600, 900), (239, 235, 221))
    background = built["appearance-jiangnan-v1.webp"].resize(canvas.size, Image.Resampling.LANCZOS)
    canvas.paste(background)
    wash = Image.new("RGBA", canvas.size, (248, 245, 235, 150))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), wash).convert("RGB")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    labels = [
        ("origin-shen-branch-v1.webp", "shen branch"),
        ("origin-streetborn-v1.webp", "streetborn"),
        ("origin-mystery-v1.webp", "mystery"),
    ]
    card_width, card_height = 360, 480
    gap = 46
    start_x = (canvas.width - (card_width * 3 + gap * 2)) // 2
    top = 150
    for index, (name, label) in enumerate(labels):
        card = built[name].resize((card_width, card_height), Image.Resampling.LANCZOS)
        left = start_x + index * (card_width + gap)
        canvas.paste(card, (left, top))
        draw.rectangle((left, top, left + card_width - 1, top + card_height - 1), outline=(86, 105, 101), width=2)
        draw.text((left + 10, top + card_height + 12), label, fill=(48, 60, 58), font=font)
    QA_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    save_webp(canvas, QA_OUTPUT, quality=90)


def validate() -> None:
    expected = {
        "origin-shen-branch-v1.webp": CARD_SIZE,
        "origin-streetborn-v1.webp": CARD_SIZE,
        "origin-mystery-v1.webp": CARD_SIZE,
        "appearance-jiangnan-v1.webp": BACKGROUND_SIZE,
    }
    actual = {path.name for path in OUTPUT.glob("*.webp")}
    if actual != set(expected):
        raise SystemExit(f"creation art mismatch: expected={sorted(expected)} actual={sorted(actual)}")
    for name, size in expected.items():
        with Image.open(OUTPUT / name) as image:
            if image.size != size:
                raise SystemExit(f"wrong creation art size for {name}: {image.size}")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    built = build_assets()
    build_qa_sheet(built)
    validate()
    print(f"creation art v1 built: {len(built)} runtime assets")


if __name__ == "__main__":
    main()
