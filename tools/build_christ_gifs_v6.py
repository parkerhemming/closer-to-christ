from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
PARTS = ASSETS / "christ-animation-v6"
V2_PARTS = ASSETS / "christ-animation-v2"
V3_PARTS = ASSETS / "christ-animation-v3"
MASTER = ASSETS / "christ-animation-v5" / "frame-1-master.png"
BALD_REPAIR = V3_PARTS / "repaired-bald-underlay.png"
WIND_REPAIR = V2_PARTS / "repaired-wind-base.png"
TORSO_REPAIR = V2_PARTS / "repaired-torso-underlay.png"
OUTPUT = ASSETS / "christ-gifs-v6"
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


def remove_wrist_dangles(master: Image.Image) -> Image.Image:
    """Erase only the loose cord ends below each wrist."""
    result = master.copy()
    alpha = result.getchannel("A")
    removal = Image.new("L", result.size, 0)
    draw = ImageDraw.Draw(removal)

    # Viewer-left wrist. The mask begins below the wrapped binding and stays
    # left of the forearm edge.
    draw.polygon(
        [(244, 251), (260, 250), (261, 268), (260, 289),
         (257, 304), (247, 304), (244, 285)],
        fill=255,
    )
    # Viewer-right wrist. This cord is completely separated from the arm once
    # it leaves the wrapped binding.
    draw.polygon(
        [(830, 249), (843, 248), (843, 276), (840, 294),
         (832, 294), (830, 277)],
        fill=255,
    )
    removal = removal.filter(ImageFilter.GaussianBlur(0.65))
    alpha = ImageChops.subtract(alpha, removal)
    result.putalpha(alpha)
    return result


def create_precise_hair_mask(
    master: Image.Image,
    bald_repair: Image.Image,
) -> Image.Image:
    region = soft_polygon(
        master.size,
        [
            (538, 369), (565, 366), (590, 378), (607, 395),
            (617, 417), (614, 440), (602, 459), (582, 477),
            (562, 472), (552, 451), (549, 428), (545, 402),
        ],
        0.8,
    )
    difference = ImageChops.difference(
        master.convert("RGB"), bald_repair.convert("RGB")
    ).convert("L").point(lambda value: 255 if value > 38 else 0)
    saturation = master.convert("HSV").getchannel("S").point(
        lambda value: 255 if value > 88 else 0
    )
    hair_color = ImageChops.multiply(difference, saturation)
    hair_color = hair_color.filter(ImageFilter.MaxFilter(3))
    hair_color = hair_color.filter(ImageFilter.GaussianBlur(0.7))
    mask = ImageChops.multiply(region, hair_color)
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
            1.0 / scale_x, 0.0, ax - ax / scale_x,
            0.0, 1.0 / scale_y, ay - ay / scale_y,
        ),
        resample=Image.Resampling.BICUBIC,
    )


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def wind_envelope(progress: float, profile: str) -> float:
    """All profiles are exactly neutral at both clip boundaries."""
    if profile == "calm":
        return math.sin(math.pi * progress) ** 2
    if profile == "wind":
        ramp = smoothstep(progress / 0.18)
        release = smoothstep((1.0 - progress) / 0.24)
        return ramp * release

    # Strong gust: a fast rise, a clear peak, then a long controlled release.
    if progress < 0.18:
        return smoothstep(progress / 0.18)
    if progress < 0.42:
        return 1.0
    return 1.0 - smoothstep((progress - 0.42) / 0.58)


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
    # Clear the prior transparent frame before drawing the next complete frame.
    # The old one-off flicker came from a mismatched source frame, not disposal.
    paletted.info["disposal"] = 2
    return paletted


def build_animation(
    name: str,
    master: Image.Image,
    static_base: Image.Image,
    torso: Image.Image,
    moving_hair: Image.Image,
    cloth: Image.Image,
    paper: Image.Image,
    profile: str,
    strength: float,
    frames_count: int = 57,
    duration_ms: int = 120,
) -> dict[str, int | str]:
    width, height = static_base.size
    sx = width / 1086
    sy = height / 1448
    torso_anchor = (548 * sx, 694 * sy)
    hair_anchor = (553 * sx, 374 * sy)
    cloth_anchor = (666 * sx, 711 * sy)
    paper_anchor = (550 * sx, 135 * sy)
    rgba_frames: list[Image.Image] = []

    for index in range(frames_count):
        # Including both endpoints makes frame 1 and the final frame identical.
        progress = index / (frames_count - 1)
        phase = math.tau * progress
        envelope = wind_envelope(progress, profile)
        flutter = 0.78 + 0.22 * math.sin(phase * 2.0 - 0.6)
        motion = envelope * flutter

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
            0.0018 * strength * motion,
            hair_anchor[1],
        )
        hair_frame = rotate_layer(
            hair_frame,
            0.72 * strength * motion,
            hair_anchor,
            (0.34 * strength * motion, -0.04 * strength * motion),
        )

        cloth_frame = shear_layer(
            cloth,
            0.0022 * strength * motion,
            cloth_anchor[1],
        )
        cloth_frame = rotate_layer(
            cloth_frame,
            1.15 * strength * motion,
            cloth_anchor,
            (0.62 * strength * motion, -0.08 * strength * motion),
        )

        # The paper stays restrained even during the strongest gust. A tiny
        # enlargement keeps the unchanged paper underneath from peeking out.
        paper_frame = scale_layer(
            paper,
            1.0 + 0.0025 * envelope,
            1.0 + 0.0012 * envelope,
            paper_anchor,
        )
        paper_frame = rotate_layer(
            paper_frame,
            0.20 * strength * motion,
            paper_anchor,
            (0.10 * strength * motion, 0.0),
        )

        frame = Image.alpha_composite(static_base, torso_frame)
        frame = Image.alpha_composite(frame, moving_hair if index == 0 else hair_frame)
        frame = Image.alpha_composite(frame, cloth if index == 0 else cloth_frame)
        frame = Image.alpha_composite(frame, paper if index == 0 else paper_frame)
        rgba_frames.append(frame)

    # Force the last frame to be the exact same composited neutral frame as the
    # first. Every animation can therefore follow every other animation.
    rgba_frames[-1] = rgba_frames[0].copy()

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
        optimize=False,
    )
    return {
        "file": output_path.name,
        "frames": frames_count,
        "frame_duration_ms": duration_ms,
        "clip_duration_ms": frames_count * duration_ms,
        "boundary_pose": "neutral-shared",
    }


def main() -> None:
    PARTS.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)

    original = Image.open(MASTER).convert("RGBA")
    original.save(PARTS / "original-with-wrist-dangles.png")
    master = remove_wrist_dangles(original)
    master.save(PARTS / "clean-master-no-wrist-dangles.png")

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
    paper_mask = soft_polygon(
        master.size,
        [
            (476, 39), (622, 41), (638, 51), (633, 216),
            (622, 228), (479, 228), (466, 214), (468, 53),
        ],
        1.0,
    )

    static_base = master.copy()
    static_base.paste(bald_repair, (0, 0), hair_mask)
    static_base.paste(wind_repair, (0, 0), cloth_mask)
    static_base.paste(torso_repair, (0, 0), torso_mask)

    moving_hair = isolate(master, hair_mask)
    torso = isolate(master, torso_mask)
    cloth = isolate(master, cloth_mask)
    paper = isolate(master, paper_mask)

    static_base.save(PARTS / "static-base-filled.png")
    moving_hair.save(PARTS / "moving-hair-right-side-only.png")
    hair_mask.save(PARTS / "moving-hair-mask.png")
    torso.save(PARTS / "torso-breathing-layer.png")
    cloth.save(PARTS / "cloth-tail-layer.png")
    paper.save(PARTS / "paper-layer.png")

    output_height = round(master.height * OUTPUT_WIDTH / master.width)
    target_size = (OUTPUT_WIDTH, output_height)
    layers = [master, static_base, torso, moving_hair, cloth, paper]
    resized = [layer.resize(target_size, Image.Resampling.LANCZOS) for layer in layers]

    manifest = {
        "calm": build_animation(
            "calm", *resized, profile="calm", strength=0.30
        ),
        "wind": build_animation(
            "wind", *resized, profile="wind", strength=2.00
        ),
        "strong-wind": build_animation(
            "strong-wind", *resized, profile="gust", strength=5.00
        ),
    }
    (OUTPUT / "animation-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
