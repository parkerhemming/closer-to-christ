from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
PARTS = ASSETS / "christ-animation-v5"
V2_PARTS = ASSETS / "christ-animation-v2"
V3_PARTS = ASSETS / "christ-animation-v3"
MASTER = PARTS / "frame-1-master.png"
BALD_REPAIR = V3_PARTS / "repaired-bald-underlay.png"
WIND_REPAIR = V2_PARTS / "repaired-wind-base.png"
TORSO_REPAIR = V2_PARTS / "repaired-torso-underlay.png"
OUTPUT = ASSETS / "christ-gifs-v5"
OUTPUT_WIDTH = 600


def soft_polygon(
    size: tuple[int, int],
    points: list[tuple[int, int]],
    feather: float,
) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(feather))


def isolate(source: Image.Image, mask: Image.Image) -> Image.Image:
    result = source.copy()
    result.putalpha(ImageChops.multiply(source.getchannel("A"), mask))
    return result


def create_precise_hair_mask(
    master: Image.Image,
    bald_repair: Image.Image,
) -> Image.Image:
    # Only the circled viewer-right locks (Jesus's left). The polygon begins
    # below the crown and never reaches the face, beard, or opposite-side hair.
    region = soft_polygon(
        master.size,
        [
            (538, 369), (565, 366), (590, 378), (607, 395),
            (617, 417), (614, 440), (602, 459), (582, 477),
            (562, 472), (552, 451), (549, 428), (545, 402),
        ],
        0.8,
    )

    # A pixel must differ substantially from the bald repair and also fall in
    # the brown-hair saturation range. This rejects the neck and shoulder even
    # when their shadows are as dark as the hair.
    difference = ImageChops.difference(
        master.convert("RGB"),
        bald_repair.convert("RGB"),
    ).convert("L").point(lambda value: 255 if value > 38 else 0)
    hsv = master.convert("HSV")
    saturation = hsv.getchannel("S").point(
        lambda value: 255 if value > 88 else 0
    )
    hair_color = ImageChops.multiply(difference, saturation)
    hair_color = hair_color.filter(ImageFilter.MaxFilter(3))
    hair_color = hair_color.filter(ImageFilter.GaussianBlur(0.7))
    mask = ImageChops.multiply(region, hair_color)

    # Explicit crown exclusion. This is intentionally larger than the crown's
    # right edge so no thorn can ever inherit the hair motion.
    crown_lock = soft_polygon(
        master.size,
        [(520, 330), (575, 330), (584, 377), (551, 389), (523, 373)],
        1.2,
    )
    return ImageChops.subtract(mask, crown_lock)


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


def shear_layer(layer: Image.Image, shear: float, anchor_y: float) -> Image.Image:
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


def adjustment_bump(progress: float) -> float:
    start, end = 0.63, 0.79
    if not start <= progress <= end:
        return 0.0
    local = (progress - start) / (end - start)
    return math.sin(math.pi * local) ** 2


def gif_frame(frame: Image.Image, shared_palette: Image.Image) -> Image.Image:
    paletted = frame.convert("RGB").quantize(
        palette=shared_palette,
        dither=Image.Dither.NONE,
    )
    transparent = frame.getchannel("A").point(lambda value: 255 if value <= 24 else 0)
    paletted.paste(255, mask=transparent)
    paletted.info["transparency"] = 255
    paletted.info["disposal"] = 2
    return paletted


def build_animation(
    name: str,
    master: Image.Image,
    static_base: Image.Image,
    torso: Image.Image,
    moving_hair: Image.Image,
    cloth: Image.Image,
    wind_strength: float,
    frames_count: int = 56,
    duration_ms: int = 130,
) -> None:
    width, height = static_base.size
    sx = width / 1086
    sy = height / 1448
    torso_anchor = (548 * sx, 694 * sy)
    hair_anchor = (553 * sx, 374 * sy)
    cloth_anchor = (666 * sx, 711 * sy)
    rgba_frames: list[Image.Image] = []

    for index in range(frames_count):
        progress = index / frames_count
        phase = math.tau * progress

        # Every motion curve is exactly zero at frame 1.
        wind_wave = math.sin(phase) + 0.20 * math.sin(phase * 3)
        secondary_wave = math.sin(phase) + 0.12 * math.sin(phase * 2)

        breath = 0.5 - 0.5 * math.cos(phase * 2)
        torso_frame = scale_layer(
            torso,
            1.0 + 0.0042 * breath,
            1.0 + 0.0012 * breath,
            torso_anchor,
        )
        settle = adjustment_bump(progress)
        torso_frame = rotate_layer(
            torso_frame,
            0.09 * settle,
            torso_anchor,
            (0.45 * settle, 0.24 * settle),
        )

        hair_frame = shear_layer(
            moving_hair,
            0.0012 * wind_strength * wind_wave,
            hair_anchor[1],
        )
        hair_frame = rotate_layer(
            hair_frame,
            0.30 * wind_strength * wind_wave,
            hair_anchor,
            (0.18 * wind_strength * wind_wave, 0.0),
        )

        cloth_frame = shear_layer(
            cloth,
            0.0013 * wind_strength * wind_wave,
            cloth_anchor[1],
        )
        cloth_frame = rotate_layer(
            cloth_frame,
            0.56 * wind_strength * wind_wave,
            cloth_anchor,
            (0.36 * wind_strength * wind_wave, 0.08 * wind_strength * secondary_wave),
        )

        frame = Image.alpha_composite(static_base, torso_frame)
        frame = Image.alpha_composite(frame, hair_frame)
        frame = Image.alpha_composite(frame, cloth_frame)

        # Frame 1 is not an approximation: it is the master image itself.
        if index == 0:
            frame = master.copy()
        rgba_frames.append(frame)

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

    master = Image.open(MASTER).convert("RGBA")
    bald_repair = Image.open(BALD_REPAIR).convert("RGBA")
    wind_repair = Image.open(WIND_REPAIR).convert("RGBA")
    torso_repair = Image.open(TORSO_REPAIR).convert("RGBA")

    hair_mask = create_precise_hair_mask(master, bald_repair)
    cloth_mask = soft_polygon(
        master.size,
        [
            (646, 699), (686, 706), (708, 751), (729, 814),
            (735, 858), (712, 908), (663, 918), (637, 884),
            (648, 817), (640, 756),
        ],
        1.8,
    )
    torso_mask = soft_polygon(
        master.size,
        [
            (453, 425), (482, 422), (519, 438), (557, 434),
            (601, 416), (636, 443), (653, 497), (648, 568),
            (629, 644), (604, 694), (493, 694), (468, 646),
            (451, 560), (447, 480),
        ],
        7.0,
    )

    static_base = master.copy()
    static_base.paste(bald_repair, (0, 0), hair_mask)
    static_base.paste(wind_repair, (0, 0), cloth_mask)
    static_base.paste(torso_repair, (0, 0), torso_mask)

    moving_hair = isolate(master, hair_mask)
    torso = isolate(master, torso_mask)
    cloth = isolate(master, cloth_mask)

    # Save inspectable parts and a diagnostic showing the exact hair boundary.
    static_base.save(PARTS / "static-base-filled.png")
    moving_hair.save(PARTS / "moving-hair-right-side-only.png")
    hair_mask.save(PARTS / "moving-hair-mask.png")
    torso.save(PARTS / "torso-breathing-layer.png")
    cloth.save(PARTS / "cloth-tail-layer.png")

    diagnostic = master.copy()
    red = Image.new("RGBA", master.size, (255, 0, 0, 150))
    diagnostic.alpha_composite(isolate(red, hair_mask))
    diagnostic.save(PARTS / "moving-hair-mask-preview.png")

    output_height = round(master.height * OUTPUT_WIDTH / master.width)
    target_size = (OUTPUT_WIDTH, output_height)
    layers = [master, static_base, torso, moving_hair, cloth]
    resized = [layer.resize(target_size, Image.Resampling.LANCZOS) for layer in layers]

    build_animation("calm-v5", *resized, wind_strength=0.35)
    build_animation("wind-v5", *resized, wind_strength=1.0)
    build_animation("strong-wind-v5", *resized, wind_strength=2.0)


if __name__ == "__main__":
    main()
