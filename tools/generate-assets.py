"""Regenerates the WP Downloader icons (PNG/ICO) and the EPUB placeholder cover.

Requires: Pillow + numpy (bundled runtime). Run from the project root:

    python tools/generate-assets.py
"""

import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ICON_DIR = ROOT / "static" / "icons"
EPUB_IMAGES = ROOT / "templates" / "epub" / "OPS" / "images"

TOP = (255, 138, 80)      # #ff8a50
BOTTOM = (240, 78, 35)    # #f04e23
ACCENT = (255, 107, 48)   # #ff6b30
WHITE = (255, 255, 255)

S = 512  # master canvas size


def vertical_gradient(size, top=TOP, bottom=BOTTOM):
    """Returns an RGB image with a vertical linear gradient."""
    w, h = size
    t = np.linspace(0.0, 1.0, h, dtype=np.float32).reshape(-1, 1, 1)
    top = np.array(top, dtype=np.float32).reshape(1, 1, 3)
    bottom = np.array(bottom, dtype=np.float32).reshape(1, 1, 3)
    arr = top * (1.0 - t) + bottom * t
    arr = np.repeat(arr, w, axis=1)
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def draw_logo(size=S, rounded=True, glyph_scale=1.0):
    """Draws the master logo. rounded=True → transparent corners outside the
    rounded square; rounded=False → full-bleed gradient (for apple-touch-icon)."""
    base = vertical_gradient((size, size))

    if rounded:
        base = base.convert("RGBA")
        mask = Image.new("L", (size, size), 0)
        d = ImageDraw.Draw(mask)
        radius = int(round(size * 112 / S))
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
        base.putalpha(mask)

    img = base.convert("RGBA")
    k = glyph_scale * size / S

    def sc(*values):
        return [v * k for v in values]

    draw = ImageDraw.Draw(img)

    # Book (white rounded rectangle)
    draw.rounded_rectangle(sc(132, 152, 380, 360), radius=26 * k, fill=WHITE + (255,))

    # Spine
    draw.rectangle(sc(253, 160, 259, 352), fill=BOTTOM + (255,))

    # Download arrow (shaft + head)
    draw.rounded_rectangle(sc(240, 214, 272, 302), radius=8 * k, fill=ACCENT + (255,))
    draw.polygon(sc(234, 302, 278, 302, 256, 348), fill=ACCENT + (255,))

    return img


def main():
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    EPUB_IMAGES.mkdir(parents=True, exist_ok=True)

    master = draw_logo(S, rounded=True)

    # Favicons & app icons
    (ICON_DIR / "favicon-16x16.png").unlink(missing_ok=True)
    (ICON_DIR / "favicon-32x32.png").unlink(missing_ok=True)
    master.resize((16, 16), Image.LANCZOS).save(ICON_DIR / "favicon-16x16.png")
    master.resize((32, 32), Image.LANCZOS).save(ICON_DIR / "favicon-32x32.png")

    ico = master.convert("RGBA")
    ico.save(ICON_DIR / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    apple = draw_logo(180, rounded=False)
    apple.save(ICON_DIR / "apple-touch-icon.png")

    master.resize((192, 192), Image.LANCZOS).save(ICON_DIR / "android-chrome-192x192.png")
    master.resize((512, 512), Image.LANCZOS).save(ICON_DIR / "android-chrome-512x512.png")
    master.resize((150, 150), Image.LANCZOS).save(ICON_DIR / "mstile-150x150.png")

    # Maskable icon: glyph shrunk into the safe zone
    maskable = draw_logo(S, rounded=False, glyph_scale=0.68)
    maskable.save(ICON_DIR / "maskable-512x512.png")

    # EPUB placeholder cover (512x800, portrait)
    cover = vertical_gradient((512, 800))
    cover = cover.convert("RGBA")
    draw = ImageDraw.Draw(cover)
    draw.rounded_rectangle([96, 216, 416, 584], radius=40, fill=WHITE + (255,))
    draw.rectangle([277, 228, 286, 572], fill=BOTTOM + (255,))
    draw.rounded_rectangle([258, 310, 306, 440], radius=12, fill=ACCENT + (255,))
    draw.polygon([249, 440, 315, 440, 282, 508], fill=ACCENT + (255,))
    cover.convert("RGB").save(EPUB_IMAGES / "placeholder.jpg", quality=90)

    print("Assets regenerated:")
    for file in sorted(ICON_DIR.iterdir()):
        print(" ", file.relative_to(ROOT))
    print(" ", EPUB_IMAGES / "placeholder.jpg")


if __name__ == "__main__":
    main()
