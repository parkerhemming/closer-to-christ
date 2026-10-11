# Bakes each cloud layer's top/bottom fade into its image, so the page needs
# no CSS mask (in Chrome each mask was a second full-size GPU layer per cloud,
# enough to run out of graphics memory and flash).
#
# The fade only varies from top to bottom and the clouds only drift sideways,
# so multiplying each image row's alpha by the fade at the height where that
# row lands in the cloud frame gives exactly what the mask did. Phones use a
# shorter frame (124dvh, not 140dvh), so each layer gets two versions.
#
# Run from the project folder after changing a fade, image, --cloud-y or
# --cloud-image-height (they must match styles.css):
#   python3 tools/bake-cloud-fades.py      (needs Pillow with AVIF support)
from PIL import Image

FULL_CUMULUS = "assets/clouds/storm-cloud-cumulus.avif"
SMALL_CUMULUS = "assets/mobile/storm-cloud-cumulus.avif"
SMALL_ALPHA = "assets/mobile/storm-cloud-alpha.avif"
SMALL_MAP = "assets/mobile/storm-cloud-map.avif"

# layer: (computer image, phone image, --cloud-y, --cloud-image-height (dvh),
#         fade stops as (fraction of the frame, opacity))
LAYERS = {
    "far": (SMALL_MAP, SMALL_MAP, 0, 110, [(0, 0), (0.08, 1), (0.46, 1), (0.72, 0)]),
    "deep": (FULL_CUMULUS, SMALL_CUMULUS, 5, 55, [(0, 0), (0.07, 1), (0.43, 1), (0.64, 0)]),
    "middle": (SMALL_ALPHA, SMALL_ALPHA, -2, 88, [(0, 0), (0.06, 1), (0.43, 1), (0.68, 0)]),
    "midband": (SMALL_ALPHA, SMALL_ALPHA, 16, 64,
                [(0.33, 0), (0.35, 0.4), (0.37, 1), (0.43, 1), (0.45, 0.42), (0.47, 0)]),
    "lower": (FULL_CUMULUS, FULL_CUMULUS, 58, 25, [(0.38, 0), (0.46, 1), (0.57, 1), (0.68, 0)]),
    "near": (FULL_CUMULUS, SMALL_CUMULUS, 9, 46, [(0, 0), (0.08, 1), (0.38, 1), (0.60, 0)]),
}
FRAMES = {"assets/clouds/baked": 140, "assets/mobile/clouds": 124}


def fade(stops, at):
    if at <= stops[0][0]:
        return stops[0][1]
    for (a, x), (b, y) in zip(stops, stops[1:]):
        if at <= b:
            return x + (y - x) * (at - a) / (b - a)
    return stops[-1][1]


for folder, frame in FRAMES.items():
    for name, (computer, phone, top, height, stops) in LAYERS.items():
        image = Image.open(computer if frame == 140 else phone).convert("RGBA")
        alpha = image.getchannel("A")
        rows = image.height
        scale = [fade(stops, (top + height * (r + 0.5) / rows) / frame) for r in range(rows)]
        alpha = Image.frombytes("L", alpha.size, bytes(
            round(value * scale[i // image.width]) for i, value in enumerate(alpha.tobytes())))
        image.putalpha(alpha)
        image.save(f"{folder}/{name}.avif", "AVIF", quality=75)
        print(f"{folder}/{name}.avif {image.size}")
