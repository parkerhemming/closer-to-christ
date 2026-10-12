# Bakes how much each part of the two near land layers sways in the wind into
# small greyscale images (assets/wind/*-sway-v2.png) that wind.js reads: white
# sways the most, black stays still.
#
# Near ground: grass is told from rock by texture and colour. Thin upright
# blades make sharp side-to-side changes in brightness but few up-and-down
# ones, and they are tan; the rocks are smooth.
# Golgotha ridge: its rocks are pale cream, so anything darker (the sage
# bushes) or more strongly coloured (the tan grass) is a plant.
#
# Each plant is then weighted by height above its base, so roots stay put and
# tips move most. Rocks are found too and kept still, with a margin as wide as
# the farthest sway: blurred, the plants spilled onto rocks beside them, and
# a plant shifting next to a rock would drag the rock's edge with it.
#
# The service worker keeps assets/ files forever, so give the outputs a new
# version number (and update plantWind in app.js) whenever they change.
#
# Run from the project folder after changing either image:
#   python3 tools/bake-plant-sway.py   (needs numpy, scipy and Pillow with AVIF)
import numpy as np
from PIL import Image
from scipy import ndimage as nd


# Blurred over the visible pixels only, so the sky doesn't darken edges.
def soft(values, alpha, sigma):
    return nd.gaussian_filter(values * alpha, sigma) / (nd.gaussian_filter(alpha, sigma) + 1e-4)


def saturation(rgb):
    lightest = rgb.max(-1)
    return (lightest - rgb.min(-1)) / (lightest + 1e-3)


def solid(alpha):
    return nd.binary_erosion(alpha > 0.9, iterations=3)


def near_ground_plants(rgb, alpha):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    brightness = rgb @ [0.3, 0.59, 0.11]
    across = nd.gaussian_filter(np.abs(nd.sobel(brightness, 1)), 6)
    down = nd.gaussian_filter(np.abs(nd.sobel(brightness, 0)), 6)
    streaky = np.clip((across - 1.25 * down) / (across + 1e-3), 0, 1)
    busy = np.clip(across / np.percentile(across[alpha > 0.5], 80), 0, 1)
    tan = np.clip(((r + g) / 2 - b - 0.08) / 0.15, 0, 1)
    grass = np.clip((nd.gaussian_filter(streaky * busy * tan, 4) - 0.03) / 0.1, 0, 1)
    # The wispy tips against the sky are half see-through.
    wisps = nd.gaussian_filter(((alpha > 0.02) & (alpha < 0.85)) * tan, 3)
    grass = np.maximum(grass, np.clip(wisps * 3, 0, 1)) * (alpha > 0.02)
    return nd.gaussian_filter(nd.grey_dilation(grass, size=(9, 9)), 5)


# Its rocks are smooth and greyer than the grass.
def near_ground_rocks(rgb, alpha):
    brightness = rgb @ [0.3, 0.59, 0.11]
    fine = soft(np.abs(brightness - nd.gaussian_filter(brightness, 1.2)), alpha, 3)
    smooth = fine < np.percentile(fine[alpha > 0.5], 50)
    rocks = smooth & (soft(saturation(rgb), alpha, 3) < 0.33)
    rocks = nd.binary_opening(nd.binary_closing(rocks, iterations=2), iterations=3) & solid(alpha)
    # Real rocks are big; small patches are soft grass tops.
    labels, count = nd.label(rocks)
    sizes = nd.sum(rocks, labels, range(1, count + 1))
    return np.isin(labels, np.flatnonzero(sizes >= 600) + 1)


def ridge_plants(rgb, alpha):
    darker = np.clip((0.66 - soft(rgb.max(-1), alpha, 5)) / 0.14, 0, 1)
    coloured = np.clip((soft(saturation(rgb), alpha, 3) - 0.33) / 0.08, 0, 1)
    plants = np.maximum(darker, coloured) * (alpha > 0.02)
    return nd.gaussian_filter(nd.grey_dilation(plants, size=(7, 7)), 4)


# Its rocks are pale cream.
def ridge_rocks(rgb, alpha):
    pale = (soft(rgb.max(-1), alpha, 2) > 0.6) & (soft(saturation(rgb), alpha, 2) < 0.32)
    return nd.binary_opening(nd.binary_closing(pale, iterations=3), iterations=1) & solid(alpha)


# source, output, how plants and rocks are found, px above a plant's base
# where it sways fully
LAYERS = [
    ("assets/near-ground-v3.avif", "assets/wind/near-ground-sway-v2.png",
     near_ground_plants, near_ground_rocks, 50),
    ("assets/golgotha-ridge-v3.avif", "assets/wind/golgotha-ridge-sway-v2.png",
     ridge_plants, ridge_rocks, 60),
]
STILL_MARGIN = 12  # px of the source around each rock; the farthest sway

for source, output, find_plants, find_rocks, tip_height in LAYERS:
    image = np.asarray(Image.open(source).convert("RGBA")).astype(np.float32) / 255
    rgb, alpha = image[..., :3], image[..., 3]
    plants = find_plants(rgb, alpha)

    # Height above the base: count plant pixels upward from where it starts.
    height = np.zeros_like(plants)
    for y in range(plants.shape[0] - 2, -1, -1):
        height[y] = np.where(plants[y] > 0.3, height[y + 1] + 1, 0)
    sway = nd.gaussian_filter(plants * np.clip(height / tip_height, 0, 1) ** 1.2, 4)
    near_rocks = nd.binary_dilation(find_rocks(rgb, alpha), iterations=STILL_MARGIN)
    sway *= 1 - nd.gaussian_filter(near_rocks.astype(np.float32), 3)

    # It only needs to be smooth, so a quarter of the size is plenty.
    small = Image.fromarray((np.clip(sway, 0, 1) * 255).astype(np.uint8))
    small = small.resize((image.shape[1] // 4, image.shape[0] // 4), Image.LANCZOS)
    small.save(output, optimize=True)
    print(f"{output}: {small.size[0]}x{small.size[1]}")
