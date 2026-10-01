from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter
from align_supplied_hair import main as align_supplied_hair


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "christ-removed-bg.png"
V3_PARTS = ASSETS / "christ-animation-v3"
PARTS = ASSETS / "christ-animation-v4"
OUTPUT = ASSETS / "christ-gifs-v4"
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


def gif_frame(frame: Image.Image, shared_palette: Image.Image) -> Image.Image:
    palette_frame = frame.convert("RGB").quantize(
        palette=shared_palette,
        dither=Image.Dither.NONE,
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
    hair: Image.Image,
    crown: Image.Image,
    cloth: Image.Image,
    wind_strength: float,
    frames_count: int = 56,
    duration_ms: int = 130,
) -> None:
    width, height = static_base.size
    sx = width / 1086
    sy = height / 1448
    torso_anchor = (548 * sx, 694 * sy)
    hair_anchor = (505 * sx, 333 * sy)
    cloth_anchor = (666 * sx, 711 * sy)
    rgba_frames: list[Image.Image] = []

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

        hair_frame = shear_layer(
            hair,
            0.0019 * wind_strength * wind_wave,
            hair_anchor[1],
        )
        hair_frame = rotate_layer(
            hair_frame,
            0.34 * wind_strength * wind_wave,
            hair_anchor,
            (0.34 * wind_strength * (wind_wave + 1), 0.04 * wind_strength * secondary_wave),
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
        frame = Image.alpha_composite(frame, hair_frame)
        # The crown is a separate, stationary layer above the supplied hair.
        # The supplied hair contains a transparent face opening, so facial
        # pixels never enter the moving transform at all.
        frame = Image.alpha_composite(frame, crown)
        frame = Image.alpha_composite(frame, cloth_frame)
        rgba_frames.append(frame)

    # A shared palette keeps every static facial pixel the same color across
    # frames instead of allowing per-frame GIF quantization to create shimmer.
    shared_palette = rgba_frames[0].convert("RGB").quantize(
        colors=255,
        method=Image.Quantize.MEDIANCUT,
    )
    frames = [gif_frame(frame, shared_palette) for frame in rgba_frames]

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

    align_supplied_hair()
    static_base = Image.open(V3_PARTS / "static-base-filled.png").convert("RGBA")
    torso = Image.open(V3_PARTS / "torso-breathing-layer.png").convert("RGBA")
    cloth = Image.open(V3_PARTS / "cloth-tail-layer.png").convert("RGBA")
    hair = Image.open(PARTS / "supplied-hair-aligned.png").convert("RGBA")
    crown = Image.open(PARTS / "crown-only-layer.png").convert("RGBA")

    output_height = round(static_base.height * OUTPUT_WIDTH / static_base.width)
    target_size = (OUTPUT_WIDTH, output_height)
    layers = [static_base, torso, hair, crown, cloth]
    resized = [layer.resize(target_size, Image.Resampling.LANCZOS) for layer in layers]

    build_animation("calm-v4", *resized, wind_strength=0.45)
    build_animation("wind-v4", *resized, wind_strength=1.35)
    build_animation("strong-wind-v4", *resized, wind_strength=2.85)


if __name__ == "__main__":
    main()
