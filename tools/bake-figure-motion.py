# Bakes where the figure moves into a small image that wind.js reads
# (assets/christ/christ-motion-v2.png):
#   red   = sways in the wind: the hair locks below the crown of thorns and
#           the loincloth's hanging end, more toward their tips, carried out
#           into the empty pixels around them so their outlines move too
#   green = rises and widens with each breath: the chest and belly
#
# The regions are drawn by hand in the coordinates of the 1186x2337 artwork.
# The service worker keeps assets/ files forever, so give the output a new
# version number (and update swayInWind in app.js) whenever it changes.
#
# Run from the project folder:
#   python3 tools/bake-figure-motion.py   (needs numpy, scipy and Pillow)
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

SOURCE = "assets/source/christ-realistic-v6.png"
OUTPUT = "assets/christ/christ-motion-v2.png"

image = np.asarray(Image.open(SOURCE).convert("RGBA")).astype(np.float32) / 255
height, width = image.shape[:2]
alpha = image[..., 3]
brightness = image[..., :3] @ [0.3, 0.59, 0.11]
rows = np.arange(height)[:, None].astype(np.float32)
columns = np.arange(width)[None, :].astype(np.float32)


def polygon(points):
    mask = Image.new("L", (width, height))
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return np.asarray(mask).astype(np.float32) / 255


# Hair: the dark locks either side of the face, from just below the crown,
# moving more toward their ends (they hang, so the ends are lowest).
locks = polygon([(372, 585), (455, 590), (460, 650), (445, 745), (372, 745)])
locks += polygon([(590, 585), (680, 600), (730, 650), (720, 735), (610, 735), (600, 660)])
dark = np.clip((0.42 - nd.gaussian_filter(brightness, 2)) / 0.15, 0, 1)
hair = nd.gaussian_filter(np.clip(locks, 0, 1) * dark, 3)
hair *= np.clip((rows - 585) / 130, 0, 1) * 0.45

# The loincloth's hanging end, fixed at the knot, swinging most at its hem
# (its inner side follows the cloth, not the thigh beside it, until the gap
# below the thigh, where the hem's corner hangs).
flap = nd.gaussian_filter(
    polygon([
        (765, 1085), (835, 1080), (885, 1190), (905, 1470), (745, 1470),
        (745, 1380), (790, 1300), (793, 1240), (780, 1190), (765, 1150),
    ]),
    4,
)
flap *= np.clip((rows - 1105) / 300, 0, 1) ** 1.2

# Breathing: strongest over the ribs, nothing at the neck, arms or waist.
chest = np.clip(1 - ((columns - 625) / 185) ** 2 - ((rows - 860) / 210) ** 2, 0, 1)
chest *= np.clip((rows - 690) / 80, 0, 1) * np.clip((1045 - rows) / 90, 0, 1)
chest = nd.gaussian_filter(chest, 8)

opaque = alpha > 0.01
sway = np.clip(hair + flap, 0, 1) * opaque
# Each pixel shows the image from where its sway points, so with no sway just
# outside an outline, the outline couldn't move: it stood still like a mask
# while the cloth inside swayed. The empty pixels around a moving part take
# its sway, fading out toward the parts that stay still (so they're never
# dragged along) and within 60px.
moving = sway > 0.02
to_moving, (near_y, near_x) = nd.distance_transform_edt(~moving, return_indices=True)
to_still = nd.distance_transform_edt(~(opaque & ~moving))
carried = sway[near_y, near_x] * to_still / (to_moving + to_still) * np.clip((60 - to_moving) / 20, 0, 1)
sway = np.where(opaque, sway, carried)
motion = np.stack([sway, chest, np.zeros_like(sway)], -1)
small = Image.fromarray((motion * 255).astype(np.uint8)).resize((width // 2, height // 2), Image.LANCZOS)
small.save(OUTPUT, optimize=True)
print(f"{OUTPUT}: {small.size[0]}x{small.size[1]}")
