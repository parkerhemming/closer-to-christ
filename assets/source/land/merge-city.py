import numpy as np
from PIL import Image
from scipy import ndimage as nd
orig = np.asarray(Image.open('city.avif').convert('RGBA')).astype(np.float32) / 255
H, W = orig.shape[:2]

def load(name, size):
    return np.asarray(Image.open(name).convert('RGB').resize(size, Image.LANCZOS)).astype(np.float32) / 255

def greenness(rgb):
    return rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])

def key(rgb):
    return np.clip(1 - (greenness(rgb) - 0.05) / 0.15, 0, 1)

# Behind the city: in each column, everything above the lowest sky (green)
# pixel is sky too (Gemini left some far hills above a band of green).
def sky_above(rgb, original):
    g = greenness(rgb) > 0.2
    alpha = key(rgb)
    rows = np.arange(rgb.shape[0])[:, None]
    lowest = np.where(g.any(0), rgb.shape[0] - 1 - np.argmax(g[::-1], 0), -1)
    # A thin run of columns where no sky was found: the sky line is taken
    # from the neighbours, but only light (far hill) pixels go, not the dark
    # cypress tips that rise above it.
    typical = nd.median_filter(lowest, 41)
    stray = (typical - lowest) > 30
    alpha[rows <= lowest[None, :]] = 0
    light = (original[..., :3] @ [0.3, 0.59, 0.11]) > 0.36
    alpha[(rows <= typical[None, :]) & stray[None, :] & light] = 0
    return alpha

alpha = orig[..., 3].copy()
rgb = orig[..., :3].copy()

for name, x0, x1 in [('cityR1-gen.png', 1652, 2911), ('cityR2-gen.png', 2837, 4096)]:
    gen = load(name, (x1 - x0, H))
    a = sky_above(gen, orig[:, x0:x1])
    alpha[:, x0:x1] = np.minimum(alpha[:, x0:x1], a)

# The left part: Gemini's repaint, colour and transparency both, blended into
# the original over 60px at the join.
left = load('cityL-gen2.png', (1652, H))
la = key(left)
left[..., 1] = np.where(la < 1, np.minimum(left[..., 1], np.maximum(left[..., 0], left[..., 2])), left[..., 1])
blend = np.clip((1652 - np.arange(W)) / 60, 0, 1)[None, :, None]  # 1 = left repaint
blend = blend * (np.arange(W) < 1652)[None, :, None]
pad = lambda x: np.concatenate([x, np.zeros((H, W - x.shape[1]) + x.shape[2:], np.float32)], 1)
rgb = rgb * (1 - blend) + pad(left) * blend
# Transparency from the repaint right up to the join (the original there is
# the old far hills), easing over the last 60px to the height of the
# original hillside just past the join, so there's no step.
beyond = alpha[:, 1652]
t = np.clip((np.arange(1652) - 1592) / 60, 0, 1)[None, :]
la = la * (1 - t) + np.minimum(la, beyond[:, None]) * t
alpha = np.where(np.arange(W)[None, :] < 1652, pad(la[..., None])[..., 0], alpha)

alpha = nd.grey_erosion(alpha, size=(2, 2))
out = Image.fromarray((np.dstack([rgb, alpha]) * 255).clip(0, 255).astype(np.uint8), 'RGBA')
out.save('city-v4.png')
view = Image.new('RGBA', out.size, (120, 150, 190, 255)); view.alpha_composite(out)
view.resize((2048, 354)).convert('RGB').save('city-v4-view.jpg', quality=88)
view.crop((1200, 0, 2600, 400)).convert('RGB').save('city-v4-seam.jpg', quality=88)

# The repaint kept the old painting's thick, near-black scrub in the bottom-
# left corner, which shows past the end of the Golgotha ridge on wide
# screens: lift its darks toward the sunlit tan around it (shapes kept),
# feathered in.
img = np.asarray(Image.open('city-v4.png').convert('RGBA')).astype(np.float32) / 255
rgb, a = img[..., :3], img[..., 3]
yy, xx = np.mgrid[0:H, 0:W]
region = np.clip((900 - xx) / 150, 0, 1) * np.clip((yy - 230) / 30, 0, 1)
L = rgb @ [0.3, 0.59, 0.11]
lift = np.clip((0.55 - L) / 0.55, 0, 1) * region
tan = np.array([0.72, 0.6, 0.42])
rgb = rgb * (1 - 0.75 * lift[..., None]) + tan * 0.75 * lift[..., None] * (0.6 + 0.8 * L[..., None])
Image.fromarray((np.dstack([np.clip(rgb, 0, 1), a]) * 255).astype(np.uint8), 'RGBA').save('city-v4.png')
