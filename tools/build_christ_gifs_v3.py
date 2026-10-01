from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "christ-removed-bg.png"
V2_PARTS = ASSETS / "christ-animation-v2"
PARTS = ASSETS / "christ-animation-v3"
WIND_REPAIR = V2_PARTS / "repaired-wind-base.png"
TORSO_REPAIR = V2_PARTS / "repaired-torso-underlay.png"
BALD_REPAIR = PARTS / "repaired-bald-underlay.png"
OUTPUT = ASSETS / "christ-gifs-v3"
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
    face_lock: Image.Image,
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
        # The face, beard, and crown are always redrawn unchanged above the
        # moving hair, so no facial pixel can inherit the hair transform.
        frame = Image.alpha_composite(frame, face_lock)
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

    original = Image.open(SOURCE).convert("RGBA")
    wind_repair = Image.open(WIND_REPAIR).convert("RGBA")
    torso_repair = Image.open(TORSO_REPAIR).convert("RGBA")
    bald_repair = Image.open(BALD_REPAIR).convert("RGBA")

    hair_region = soft_mask(
        original.size,
        [[(397, 315), (454, 300), (520, 306), (574, 329), (608, 365),
          (619, 415), (606, 469), (574, 500), (535, 500), (505, 486),
          (469, 502), (428, 496), (399, 461), (389, 408)]],
        1.0,
    )
    face_lock_mask = soft_mask(
        original.size,
        [
            # Face, eyebrows, eyes, nose, mustache and beard.
            [(423, 364), (461, 342), (507, 344), (543, 365), (558, 405),
             (550, 452), (528, 486), (490, 497), (452, 473), (428, 431)],
            # Crown of thorns, which must remain fixed above the moving hair.
            [(391, 361), (426, 337), (478, 319), (525, 321), (561, 350),
             (556, 382), (516, 385), (470, 399), (423, 424), (394, 405)],
        ],
        2.0,
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

    # Detect the exposed dark hair inside a tightly bounded head region, expand
    # it to include highlighted strands, then subtract the locked face/crown.
    luminance = original.convert("L")
    dark_hair = luminance.point(lambda value: 255 if value < 158 else 0)
    dark_hair = dark_hair.filter(ImageFilter.MaxFilter(15))
    dark_hair = dark_hair.filter(ImageFilter.GaussianBlur(1.4))
    hair_mask = ImageChops.multiply(hair_region, dark_hair)
    hair_mask = ImageChops.subtract(hair_mask, face_lock_mask)

    # Build a repaired static base. All exposed head hair is replaced with the
    # bald underlay, the torso with the reconstructed cross, and the cloth tail
    # with its repaired background. Every other original pixel remains fixed.
    static_base = original.copy()
    static_base.paste(bald_repair, (0, 0), hair_region)
    static_base.paste(wind_repair, (0, 0), cloth_mask)
    static_base.paste(torso_repair, (0, 0), torso_mask)

    torso = isolate(original, torso_mask)
    hair = isolate(original, hair_mask)
    face_lock = isolate(original, face_lock_mask)
    cloth = isolate(original, cloth_mask)

    static_base.save(PARTS / "static-base-filled.png")
    torso.save(PARTS / "torso-breathing-layer.png")
    hair.save(PARTS / "full-hair-layer.png")
    face_lock.save(PARTS / "face-beard-crown-lock-layer.png")
    hair_mask.save(PARTS / "full-hair-mask.png")
    cloth.save(PARTS / "cloth-tail-layer.png")

    output_height = round(original.height * OUTPUT_WIDTH / original.width)
    target_size = (OUTPUT_WIDTH, output_height)
    layers = [static_base, torso, hair, face_lock, cloth]
    resized = [layer.resize(target_size, Image.Resampling.LANCZOS) for layer in layers]

    build_animation("calm-v3", *resized, wind_strength=0.45)
    build_animation("wind-v3", *resized, wind_strength=1.35)
    build_animation("strong-wind-v3", *resized, wind_strength=2.85)


if __name__ == "__main__":
    main()
