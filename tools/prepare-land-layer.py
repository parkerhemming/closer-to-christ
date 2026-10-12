# Turns a generated landscape (on a flat chroma-green sky, as Gemini returns
# them: it can't make transparency) into a scene layer: the green keyed out,
# cropped to the band that's on screen, saved full size (4096 wide) and for
# phones (2048 wide).
#
#   python3 tools/prepare-land-layer.py SOURCE.png NAME TOP BOTTOM
#
# TOP and BOTTOM are the rows (as fractions of the source's height) to keep.
# Writes assets/NAME.avif and assets/mobile/NAME.avif.
# Needs numpy, scipy and Pillow with AVIF.
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as nd

source, name, top, bottom = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
image = np.asarray(Image.open(source).convert("RGB")).astype(np.float32) / 255
height = image.shape[0]
image = image[round(top * height) : round(bottom * height)]
r, g, b = image[..., 0], image[..., 1], image[..., 2]

# How much greener than red and blue: the sky is very, land isn't.
green = g - np.maximum(r, b)
alpha = np.clip(1 - (green - 0.05) / 0.15, 0, 1)
alpha = nd.grey_erosion(alpha, size=(3, 3))  # a 1px choke against green fringes
# No green left in the edges.
image[..., 1] = np.where(alpha < 1, np.minimum(g, np.maximum(r, b)), g)

rgba = Image.fromarray((np.dstack([image, alpha]) * 255).astype(np.uint8), "RGBA")
for width, folder in [(4096, "assets"), (2048, "assets/mobile")]:
    out = rgba.resize((width, round(rgba.height * width / rgba.width)), Image.LANCZOS)
    out.save(f"{folder}/{name}.avif", quality=70)
    print(f"{folder}/{name}.avif: {out.size[0]}x{out.size[1]}")
