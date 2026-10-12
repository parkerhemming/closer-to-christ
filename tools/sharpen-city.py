# Sharpens the Jerusalem image without moving a single pixel, so the hand-
# mapped window and lantern masks (assets/city-lights/) still line up: fine
# detail (walls, terraces, trees) and a little local contrast are added to the
# brightness only, then saved full size (4096 wide) and for phones (2048).
#
#   python3 tools/sharpen-city.py   (needs numpy, scipy and Pillow with AVIF)
#
# The service worker keeps assets/ files forever, so give the output a new
# version number (and update styles.css) whenever it changes.
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SOURCE = "assets/source/land/jerusalem-v4.png"
NAME = "jerusalem-v6"

image = np.asarray(Image.open(SOURCE).convert("RGBA")).astype(np.float32) / 255
rgb, alpha = image[..., :3], image[..., 3]
brightness = rgb @ [0.3, 0.59, 0.11]
fine = brightness - nd.gaussian_filter(brightness, 1.2)
local = brightness - nd.gaussian_filter(brightness, 10)
rgb = np.clip(rgb + (0.9 * fine + 0.25 * local)[..., None], 0, 1)

sharp = Image.fromarray((np.dstack([rgb, alpha]) * 255 + 0.5).astype(np.uint8), "RGBA")
for width, folder in [(4096, "assets"), (2048, "assets/mobile")]:
    out = sharp.resize((width, round(sharp.height * width / sharp.width)), Image.LANCZOS)
    out.save(f"{folder}/{NAME}.avif", quality=80)
    print(f"{folder}/{NAME}.avif: {out.size[0]}x{out.size[1]}")
