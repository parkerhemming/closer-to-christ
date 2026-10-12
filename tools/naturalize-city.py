# Makes the Jerusalem image read as one photograph instead of an AI collage,
# without moving a single pixel, so the hand-mapped window and lantern masks
# (assets/city-lights/) still line up:
# - the repainted left side (hills, terraces, rocks) is far crisper, more
#   contrasty and more saturated than the original city it meets, so it looks
#   pasted on. Its detail, contrast and colour are brought down to the city's
#   own levels (only ever down), which also calms the squiggly, over-sharp
#   "AI" texture wherever it's strongest;
# - where the two were merged, the left hill faded into the sky through a
#   see-through strip; it now ends in a solid slope;
# - a little distance haze toward the top (the far city) and a fine grain.
# Saved full size (4096 wide) and for phones (2048).
#
#   python3 tools/naturalize-city.py   (needs numpy, scipy and Pillow with AVIF)
#
# The service worker keeps assets/ files forever, so give the output a new
# version number (and update styles.css) whenever it changes.
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SOURCE = "assets/source/land/jerusalem-v4.png"
NAME = "jerusalem-v7"
REFERENCE = (slice(60, 450), slice(2400, 4096))  # rows, columns: the original city

image = np.asarray(Image.open(SOURCE).convert("RGBA")).astype(np.float32) / 255
rgb, alpha = image[..., :3], image[..., 3].copy()
opaque = alpha > 0.9

# The merge's see-through strip: solid below a slope from the left hill's top
# down to the ground beside the wall, clear above it.
rows, columns = np.mgrid[0 : alpha.shape[0], 0 : alpha.shape[1]]
strip = (columns >= 1590) & (columns <= 1670) & (rows < 240) & (alpha > 0) & (alpha < 1)
slope = 178 + (columns - 1595) * (232 - 178) / (1665 - 1595)
alpha[strip] = (rows[strip] >= slope[strip]).astype(np.float32)

def local(values, sigma=20):
    """Average over the visible pixels nearby."""
    return nd.gaussian_filter(values * opaque, sigma) / (nd.gaussian_filter(opaque.astype(np.float32), sigma) + 1e-4)

brightness = rgb @ [0.3, 0.59, 0.11]
new = brightness.copy()
# Fine detail and mid-scale contrast, each turned down where it's stronger
# than nearly anywhere in the original city.
for low, high in [(0, 1.5), (1.5, 6)]:
    band = (nd.gaussian_filter(brightness, low) if low else brightness) - nd.gaussian_filter(brightness, high)
    strength = np.sqrt(local(band**2))
    target = np.percentile(strength[REFERENCE][opaque[REFERENCE]], 75)
    new -= band * (1 - np.clip(target / (strength + 1e-4), 0.35, 1))
rgb = np.clip(rgb + (new - brightness)[..., None], 0, 1)

# Colour: saturation brought down where it's stronger than the city's
# sunlit parts, keeping their warmth.
grey = (rgb @ [0.3, 0.59, 0.11])[..., None]
saturation = np.abs(rgb - grey).max(-1)
level = local(saturation)
target = np.percentile(level[REFERENCE][opaque[REFERENCE]], 85)
rgb = grey + (rgb - grey) * np.clip(target / (level + 1e-4), 0.75, 1)[..., None]

# Distance haze toward the top (the far city), and a fine grain.
height = np.linspace(0, 1, rgb.shape[0])[:, None, None]
haze = 0.08 * np.clip(1 - height / 0.75, 0, 1) ** 1.3
rgb = rgb * (1 - haze) + np.array([0.72, 0.70, 0.68]) * haze
rgb = rgb + np.random.default_rng(7).normal(0, 0.01, rgb.shape[:2])[..., None]

out = Image.fromarray((np.dstack([np.clip(rgb, 0, 1), alpha]) * 255 + 0.5).astype(np.uint8), "RGBA")
for width, folder in [(4096, "assets"), (2048, "assets/mobile")]:
    sized = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS)
    sized.save(f"{folder}/{NAME}.avif", quality=80)
    print(f"{folder}/{NAME}.avif: {sized.size[0]}x{sized.size[1]}")
