# Trims the pale, misty far ridges from the top of a land layer (Gemini adds
# them behind the subject; keyed out of a light sky they become grey, half
# see-through bands): in each column, everything above the first solid,
# darker detail (trees, shaded rock) goes, fading over a few pixels.
#
#   python3 tools/trim-haze.py assets/NAME.avif [assets/mobile/NAME.avif]
# Needs numpy, scipy and Pillow with AVIF.
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as nd

for path in sys.argv[1:]:
    image = np.asarray(Image.open(path).convert("RGBA")).astype(np.float32) / 255
    H, W = image.shape[:2]
    scale = W / 4096
    L = image[..., :3] @ [0.2126, 0.7152, 0.0722]
    solid = (L < 0.5) & (image[..., 3] > 0.9)
    dense = nd.uniform_filter(solid.astype(np.float32), max(3, round(15 * scale))) > 0.3
    first = np.where(dense.any(0), np.argmax(dense, 0), H)
    # A smooth line: no notches where a column happens to lack dark detail.
    first = nd.minimum_filter1d(first, max(3, round(41 * scale)))  # keep tree tips
    first = nd.median_filter(first, max(3, round(201 * scale)))
    first = nd.uniform_filter1d(first.astype(np.float32), max(3, round(121 * scale)))
    rows = np.arange(H)[:, None]
    fade = np.clip((rows - (first[None, :] - 14 * scale)) / (14 * scale), 0, 1)
    image[..., 3] *= fade
    Image.fromarray((image * 255).astype(np.uint8), "RGBA").save(path, quality=70)
    print(path)
