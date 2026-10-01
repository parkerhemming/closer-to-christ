from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "christ-removed-bg.png"
OUTPUT = ROOT / "assets" / "christ-gifs"
OUTPUT_WIDTH = 600


def polygon_mask(size: tuple[int, int], polygons: list[list[tuple[int, int]]]) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    for polygon in polygons:
        draw.polygon(polygon, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(1.2))


def isolate(source: Image.Image, mask: Image.Image) -> Image.Image:
    layer = source.copy()
    layer.putalpha(ImageChops.multiply(source.getchannel("A"), mask))
    return layer


def rotate_layer(
    layer: Image.Image,
    angle: float,
    anchor: tuple[float, float],
    translate: tuple[float, float],
) -> Image.Image:
    return layer.rotate(
        angle,
        resample=Image.Resampling.BICUBIC,
        center=anchor,
        translate=translate,
    )


def gif_frame(frame: Image.Image) -> Image.Image:
    palette_frame = frame.convert("RGB").quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    alpha = frame.getchannel("A")
    transparent = alpha.point(lambda value: 255 if value <= 24 else 0)
    palette_frame.paste(255, mask=transparent)
    palette_frame.info["transparency"] = 255
    palette_frame.info["disposal"] = 2
    return palette_frame


def build_animation(
    name: str,
    base: Image.Image,
    hair_left: Image.Image,
    hair_right: Image.Image,
    cloth: Image.Image,
    frames_count: int,
    duration_ms: int,
    strength: float,
) -> None:
    width, height = base.size
    sx = width / 1086
    sy = height / 1448

    left_anchor = (455 * sx, 385 * sy)
    right_anchor = (548 * sx, 355 * sy)
    cloth_anchor = (654 * sx, 680 * sy)
    frames: list[Image.Image] = []

    for index in range(frames_count):
        phase = math.tau * index / frames_count
        ripple = math.sin(phase) + 0.32 * math.sin(phase * 3 + 0.7)
        small_ripple = math.sin(phase + 0.8) + 0.22 * math.sin(phase * 2 - 0.4)

        hair_dx = strength * (0.45 + 0.55 * (math.sin(phase - 0.4) + 1) / 2)
        hair_left_frame = rotate_layer(
            hair_left,
            strength * 0.42 * small_ripple,
            left_anchor,
            (hair_dx * 0.50, strength * 0.08 * math.sin(phase * 2)),
        )
        hair_right_frame = rotate_layer(
            hair_right,
            strength * 0.60 * ripple,
            right_anchor,
            (hair_dx, strength * 0.12 * math.sin(phase * 2 + 0.5)),
        )

        cloth_dx = strength * (0.75 + 0.75 * (math.sin(phase - 0.25) + 1) / 2)
        cloth_frame = rotate_layer(
            cloth,
            strength * 0.88 * ripple,
            cloth_anchor,
            (cloth_dx, strength * 0.18 * math.sin(phase * 2 - 0.3)),
        )

        composed = Image.alpha_composite(base, hair_left_frame)
        composed = Image.alpha_composite(composed, hair_right_frame)
        composed = Image.alpha_composite(composed, cloth_frame)
        frames.append(gif_frame(composed))

    path = OUTPUT / f"christ-{name}.gif"
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        transparency=255,
        disposal=2,
        optimize=True,
    )
    print(path)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    original = Image.open(SOURCE).convert("RGBA")

    cloth_mask = polygon_mask(
        original.size,
        [[(650, 710), (688, 720), (708, 760), (727, 812), (735, 857),
          (712, 905), (663, 916), (638, 885), (648, 820), (644, 758)]],
    )
    hair_left_mask = polygon_mask(
        original.size,
        [[(410, 382), (461, 374), (487, 408), (493, 454), (468, 494),
          (433, 478), (418, 440)]],
    )
    hair_right_mask = polygon_mask(
        original.size,
        [[(525, 344), (576, 345), (607, 374), (607, 421), (587, 466),
          (551, 468), (538, 425)]],
    )

    cloth = isolate(original, cloth_mask)
    hair_left = isolate(original, hair_left_mask)
    hair_right = isolate(original, hair_right_mask)

    # Leave the original beneath the small overlays. This prevents gaps around
    # the attachment points while the loose edges move only a few pixels.
    base = original.copy()

    output_height = round(original.height * OUTPUT_WIDTH / original.width)
    target_size = (OUTPUT_WIDTH, output_height)
    base = base.resize(target_size, Image.Resampling.LANCZOS)
    cloth = cloth.resize(target_size, Image.Resampling.LANCZOS)
    hair_left = hair_left.resize(target_size, Image.Resampling.LANCZOS)
    hair_right = hair_right.resize(target_size, Image.Resampling.LANCZOS)

    build_animation("calm", base, hair_left, hair_right, cloth, 30, 100, 0.7)
    build_animation("wind", base, hair_left, hair_right, cloth, 34, 85, 2.0)
    build_animation("strong-wind", base, hair_left, hair_right, cloth, 38, 70, 4.2)


if __name__ == "__main__":
    main()
