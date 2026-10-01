from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PARTS = ROOT / "assets" / "christ-animation-v4"

HAIR_SCALE = 0.34
HAIR_POSITION = (396, 308)
CROWN_SCALE = 0.22
CROWN_POSITION = (385, 312)


def isolate_supplied_hair() -> Image.Image:
    source = Image.open(PARTS / "supplied-hair-original.png").convert("RGBA")
    alpha = source.getchannel("A")
    substantial_alpha = alpha.point(lambda value: 255 if value >= 8 else 0)
    bbox = substantial_alpha.getbbox()
    if bbox is None:
        raise RuntimeError("The supplied hair image contains no visible pixels")

    cropped = source.crop(bbox)
    cropped_alpha = cropped.getchannel("A").point(
        lambda value: 0 if value < 8 else value
    )
    cropped.putalpha(cropped_alpha)
    target_size = (
        round(cropped.width * HAIR_SCALE),
        round(cropped.height * HAIR_SCALE),
    )
    resized = cropped.resize(target_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", source.size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, HAIR_POSITION)
    return canvas


def isolate_crown(canvas_size: tuple[int, int]) -> Image.Image:
    source = Image.open(PARTS / "crown-isolated-original.png").convert("RGBA")
    alpha = source.getchannel("A")
    substantial_alpha = alpha.point(lambda value: 255 if value >= 8 else 0)
    bbox = substantial_alpha.getbbox()
    if bbox is None:
        raise RuntimeError("The isolated crown image contains no visible pixels")

    cropped = source.crop(bbox)
    cropped_alpha = cropped.getchannel("A").point(
        lambda value: 0 if value < 8 else value
    )
    cropped.putalpha(cropped_alpha)
    target_size = (
        round(cropped.width * CROWN_SCALE),
        round(cropped.height * CROWN_SCALE),
    )
    resized = cropped.resize(target_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, CROWN_POSITION)
    return canvas


def main() -> None:
    bald = Image.open(PARTS / "repaired-bald-underlay.png").convert("RGBA")
    hair = isolate_supplied_hair()
    crown = isolate_crown(bald.size)

    preview = Image.alpha_composite(bald, hair)
    preview = Image.alpha_composite(preview, crown)

    hair.save(PARTS / "supplied-hair-aligned.png")
    crown.save(PARTS / "crown-only-layer.png")
    preview.save(PARTS / "hair-crown-alignment-preview.png")


if __name__ == "__main__":
    main()
