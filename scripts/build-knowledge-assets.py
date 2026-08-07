from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "art_source" / "knowledge" / "v1"
OUTPUT_DIR = ROOT / "web" / "assets" / "knowledge"

ASSETS = {
    "medicine-casket-master.png": "medicine-casket-v1.webp",
    "fresh-peaches-master.png": "fresh-peaches-v1.webp",
    "long-qingyu-master.png": "long-qingyu-v1.webp",
    "purple-river-night-boat-master.png": "purple-river-night-boat-v1.webp",
    "east-road-porter-master.png": "east-road-porter-v1.webp",
}


def build_asset(source_name: str, output_name: str) -> None:
    source = SOURCE_DIR / source_name
    output = OUTPUT_DIR / output_name
    with Image.open(source) as image:
        converted = image.convert("RGB")
        fitted = ImageOps.fit(converted, (1000, 800), method=Image.Resampling.LANCZOS)
        fitted.save(output, "WEBP", quality=88, method=6)
    print(f"{source.relative_to(ROOT)} -> {output.relative_to(ROOT)}")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for source_name, output_name in ASSETS.items():
        build_asset(source_name, output_name)


if __name__ == "__main__":
    main()
