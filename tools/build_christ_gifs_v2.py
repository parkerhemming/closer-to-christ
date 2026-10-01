from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "christ-removed-bg.png"
PARTS = ASSETS / "christ-animation-v2"
WIND_REPAIR = PARTS / "repaired-wind-base.png"
TORSO_REPAIR = PARTS / "repaired-torso-underlay.png"
OUTPUT = ASSETS / "christ-gifs-v2"
OUTPUT_WIDTH = 600


def soft_mask(
    size: tuple[int, int],
    polygons: list[list[tuple[int, int]]],
    feather: float,
) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    for polygon in polygons:
        draw.polygon(polygon, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(feather))


def isolate(source: Image.Image, mask: Image.Image) -> Image.Image:
    layer = source.copy()
    layer.putalpha(ImageChops.multiply(source.getchannel("A"), mask))
    return layer


def repaired_region(
    destination: Image.Image,
    repaired: Image.Image,
    mask: Image.Image,
) -> Image.Image:
    result = destination.copy()
    result.alpha_composite(isolate(repaired, mask))
    return result


def rotate_layer(
    layer: Image.Image,
    angle: float,
    anchor: tuple[float, float],
    translate: tuple[float, float] = (0.0, 0.0),
) -> Image.Image:
    return layer.rotate(
        angle,
        resample=Image.Resampling.BICUBIC,
        center=anchor,
        translate=translate,
    )


def shear_layer(
    layer: Image.Image,
    shear: float,
    anchor_y: float,
) -> Image.Image:
    # Forward motion is x' = x + shear * (y - anchor_y). Pillow expects
    # the inverse mapping from each output pixel back to the input image.
    return layer.transform(
        layer.size,
        Image.Transform.AFFINE,
        (1.0, -shear, shear * anchor_y, 0.0, 1.0, 0.0),
        resample=Image.Resampling.BICUBIC,
    )


def scale_layer(
    layer: Image.Image,
    scale_x: float,
    scale_y: float,
    anchor: tuple[float, float],
) -> Image.Image:
    ax, ay = anchor
    return layer.transform(
        layer.size,
        Image.Transform.AFFINE,
        (
            1.0 / scale_x,
            0.0,
            ax - ax / scale_x,
            0.0,
            1.0 / scale_y,
            ay - ay / scale_y,
        ),
        resample=Image.Resampling.BICUBIC,
    )


def gif_frame(frame: Image.Image) -> Image.Image:
    palette_frame = frame.convert("RGB").quantize(
        colors=255,
        method=Image.Quantize.MEDIANCUT,
    )
    transparent = frame.getchannel("A").point(lambda value: 255 if value <= 24 else 0)
    palette_frame.paste(255, mask=transparent)
    palette_frame.info["transparency"] = 255
    palette_frame.info["disposal"] = 2
    return palette_frame


def adjustment_bump(progress: float) -> float:
    # A single slow, subtle settling motion during roughly 18% of the loop.
    start, end = 0.61, 0.79
    if not start <= progress <= end:
        return 0.0
    local = (progress - start) / (end - start)
    return math.sin(math.pi * local) ** 2


def build_animation(
    name: str,
    static_base: Image.Image,
    torso: Image.Image,
    hair_left: Image.Image,
    hair_right: Image.Image,
    cloth: Image.Image,
    wind_strength: float,
    frames_count: int = 56,
    duration_ms: int = 130,
) -> None:
    width, height = static_base.size
    sx = width / 1086
    sy = height / 1448
    torso_anchor = (548 * sx, 694 * sy)
    hair_left_anchor = (454 * sx, 370 * sy)
    hair_right_anchor = (548 * sx, 352 * sy)
    cloth_anchor = (666 * sx, 711 * sy)
    frames: list[Image.Image] = []

    for index in range(frames_count):
        progress = index / frames_count
        phase = math.tau * progress
        wind_wave = math.sin(phase) + 0.28 * math.sin(phase * 3 + 0.65)
        secondary_wave = math.sin(phase + 0.9) + 0.20 * math.sin(phase * 2 - 0.3)

        # Two slow breaths per seven-second loop. Expansion is below one pixel
        # at the chest edge after downsampling.
        breath = 0.5 - 0.5 * math.cos(phase * 2)
        breathing_torso = scale_layer(
            torso,
            1.0 + 0.0046 * breath,
            1.0 + 0.0014 * breath,
            torso_anchor,
        )

        settle = adjustment_bump(progress)
        breathing_torso = rotate_layer(
            breathing_torso,
            0.11 * settle,
            torso_anchor,
            (0.55 * settle, 0.30 * settle),
        )

        left_hair = shear_layer(
            hair_left,
            0.0017 * wind_strength * secondary_wave,
            hair_left_anchor[1],
        )
        left_hair = rotate_layer(
            left_hair,
            0.32 * wind_strength * secondary_wave,
            hair_left_anchor,
            (0.25 * wind_strength * (wind_wave + 1), 0.0),
        )

        right_hair = shear_layer(
            hair_right,
            0.0023 * wind_strength * wind_wave,
            hair_right_anchor[1],
        )
        right_hair = rotate_layer(
            right_hair,
            0.46 * wind_strength * wind_wave,
            hair_right_anchor,
            (0.42 * wind_strength * (wind_wave + 1), 0.0),
        )

        cloth_frame = shear_layer(
            cloth,
            0.0016 * wind_strength * wind_wave,
            cloth_anchor[1],
        )
        cloth_frame = rotate_layer(
            cloth_frame,
            0.68 * wind_strength * wind_wave,
            cloth_anchor,
            (0.50 * wind_strength * (wind_wave + 1), 0.10 * wind_strength * secondary_wave),
        )

        frame = Image.alpha_composite(static_base, breathing_torso)
        frame = Image.alpha_composite(frame, left_hair)
        frame = Image.alpha_composite(frame, right_hair)
        frame = Image.alpha_composite(frame, cloth_frame)
        frames.append(gif_frame(frame))

    output_path = OUTPUT / f"christ-{name}.gif"
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        transparency=255,
        disposal=2,
        optimize=True,
    )
    print(output_path)


def main() -> None:
    PARTS.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)

    original = Image.open(SOURCE).convert("RGBA")
    wind_repair = Image.open(WIND_REPAIR).convert("RGBA")
    torso_repair = Image.open(TORSO_REPAIR).convert("RGBA")

    hair_left_mask = soft_mask(
        original.size,
        [[(407, 379), (438, 356), (468, 362), (487, 395), (487, 435),
          (470, 488), (435, 494), (414, 455)]],
        1.8,
    )
    hair_right_mask = soft_mask(
        original.size,
        [[(532, 343), (574, 344), (605, 371), (612, 414), (598, 459),
          (566, 480), (544, 445), (539, 399)]],
        1.8,
    )
    cloth_mask = soft_mask(
        original.size,
        [[(646, 699), (686, 706), (708, 751), (729, 814), (735, 858),
          (712, 908), (663, 918), (637, 884), (648, 817), (640, 756)]],
        1.8,
    )
    torso_mask = soft_mask(
        original.size,
        [[(453, 425), (482, 422), (519, 438), (557, 434), (601, 416),
          (636, 443), (653, 497), (648, 568), (629, 644), (604, 694),
          (493, 694), (468, 646), (451, 560), (447, 480)]],
        7.0,
    )

    # Build a genuinely repaired static base. Only the exact masked regions are
    # taken from the two AI-repaired underlays; every other original pixel stays.
    static_base = original.copy()
    wind_regions = ImageChops.lighter(
        ImageChops.lighter(hair_left_mask, hair_right_mask),
        cloth_mask,
    )
    static_base.paste(wind_repair, (0, 0), wind_regions)
    static_base.paste(torso_repair, (0, 0), torso_mask)

    torso = isolate(original, torso_mask)
    hair_left = isolate(original, hair_left_mask)
    hair_right = isolate(original, hair_right_mask)
    cloth = isolate(original, cloth_mask)

    static_base.save(PARTS / "static-base-filled.png")
    torso.save(PARTS / "torso-breathing-layer.png")
    hair_left.save(PARTS / "hair-left-layer.png")
    hair_right.save(PARTS / "hair-right-layer.png")
    cloth.save(PARTS / "cloth-tail-layer.png")

    output_height = round(original.height * OUTPUT_WIDTH / original.width)
    target_size = (OUTPUT_WIDTH, output_height)
    layers = [static_base, torso, hair_left, hair_right, cloth]
    resized = [layer.resize(target_size, Image.Resampling.LANCZOS) for layer in layers]

    build_animation("calm-v2", *resized, wind_strength=0.45)
    build_animation("wind-v2", *resized, wind_strength=1.35)
    build_animation("strong-wind-v2", *resized, wind_strength=2.85)


if __name__ == "__main__":
    main()
