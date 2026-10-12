# The outlines landShadows (app.js) casts shadows from and onto: each land
# layer's transparency, 1024 wide, slightly softened. The service worker keeps
# assets/ files forever, so bump the version (and the names in app.js) when
# a layer changes.
#
#   python3 tools/bake-shadow-shapes.py   (needs Pillow with AVIF)
from PIL import Image, ImageFilter

SHAPES = [
    ("assets/far-mountains-v2.avif", "assets/shadows/far-mountains-shape-v2.webp"),
    ("assets/hills-v5.avif", "assets/shadows/hills-shape-v3.webp"),
    ("assets/olives-v2.avif", "assets/shadows/olives-shape-v2.webp"),
    ("assets/jerusalem-v6.avif", "assets/shadows/jerusalem-land-v2.webp"),
]
for source, output in SHAPES:
    image = Image.open(source).convert("RGBA")
    alpha = image.split()[3].resize((1024, round(image.height * 1024 / image.width)), Image.LANCZOS)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    shape = Image.new("RGBA", alpha.size, (0, 0, 0, 0))
    shape.putalpha(alpha)
    shape.save(output, quality=90)
    print(output, shape.size)
