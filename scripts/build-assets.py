#!/usr/bin/env python3
"""
Build all derived app assets from two source images.

Source files (you drop these in):
  assets/source/icon-cream.png        — the icon on warm cream background
  assets/source/icon-transparent.png  — the same icon on transparency

Generated outputs:
  assets/icon.png            1024x1024  — main iOS/Android app icon
  assets/adaptive-icon.png   1024x1024  — Android adaptive foreground (transparent,
                                          glyph fits within 66% inner safe area)
  assets/splash.png          2048x2048  — splash with name + tagline below glyph
  assets/favicon.png         64x64      — web favicon

Run:  python3 scripts/build-assets.py
Idempotent — safe to re-run.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "source"
FONTS = ROOT / "scripts" / "fonts"

# Brand
CREAM = (251, 246, 238, 255)        # #FBF6EE
INK = (42, 37, 32, 255)             # #2A2520
INK_SECONDARY = (107, 99, 88, 255)  # #6B6358

# Required source files
SRC_CREAM = SOURCE / "icon-cream.png"
SRC_TRANSPARENT = SOURCE / "icon-transparent.png"

# Outputs
OUT_ICON = ASSETS / "icon.png"
OUT_ADAPTIVE = ASSETS / "adaptive-icon.png"
OUT_SPLASH = ASSETS / "splash.png"
OUT_FAVICON = ASSETS / "favicon.png"


def require_sources() -> None:
    missing = [p for p in (SRC_CREAM, SRC_TRANSPARENT) if not p.exists()]
    if missing:
        print(
            "Missing source files. Save your generated images here:\n"
            + "\n".join(f"  - {p.relative_to(ROOT)}" for p in missing),
            file=sys.stderr,
        )
        sys.exit(1)


def trim_to_glyph(im: Image.Image, alpha_threshold: int = 8) -> Image.Image:
    """Crop a transparent image down to the glyph's bounding box."""
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    alpha = im.split()[3]
    bbox = alpha.getbbox()
    if bbox is None:
        return im
    return im.crop(bbox)


def fit_centered(
    glyph: Image.Image,
    canvas: Image.Image,
    *,
    glyph_fraction: float,
) -> Image.Image:
    """Scale `glyph` so its longest side equals `glyph_fraction` of `canvas`,
    then paste centered."""
    cw, ch = canvas.size
    target = int(min(cw, ch) * glyph_fraction)
    gw, gh = glyph.size
    scale = target / max(gw, gh)
    new = glyph.resize((max(1, int(gw * scale)), max(1, int(gh * scale))), Image.LANCZOS)
    nw, nh = new.size
    canvas.paste(new, ((cw - nw) // 2, (ch - nh) // 2), new)
    return canvas


def build_icon() -> None:
    """1024x1024, cream background, glyph occupies ~64% (matches the source)."""
    src = Image.open(SRC_CREAM).convert("RGBA")
    sw, sh = src.size
    side = max(sw, sh)
    # Square out on cream so we don't get letterboxed bands of a different shade.
    canvas = Image.new("RGBA", (side, side), CREAM)
    canvas.paste(src, ((side - sw) // 2, (side - sh) // 2), src)
    canvas = canvas.resize((1024, 1024), Image.LANCZOS)
    canvas.save(OUT_ICON, format="PNG", optimize=True)
    print(f"  wrote {OUT_ICON.relative_to(ROOT)}")


def build_adaptive() -> None:
    """1024x1024 transparent. Android crops to a circle/squircle/teardrop with
    only the inner ~66% (≈675px) guaranteed visible. We size the glyph at 50%
    of the canvas so it survives every mask shape with margin to spare."""
    src = Image.open(SRC_TRANSPARENT).convert("RGBA")
    glyph = trim_to_glyph(src)
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    fit_centered(glyph, canvas, glyph_fraction=0.50)
    canvas.save(OUT_ADAPTIVE, format="PNG", optimize=True)
    print(f"  wrote {OUT_ADAPTIVE.relative_to(ROOT)}")


def build_splash() -> None:
    """2048x2048 splash. Centered glyph, then 'Qahar-e-Hijr' in Fraunces, then
    'Time, since.' in Inter. Background uses the same cream as the in-app
    `colors.bg` so the static splash flows seamlessly into the JS UI."""
    W = H = 2048
    canvas = Image.new("RGBA", (W, H), CREAM)

    # Glyph on transparency, scaled to ~22% of the canvas width.
    glyph_src = Image.open(SRC_TRANSPARENT).convert("RGBA")
    glyph = trim_to_glyph(glyph_src)
    target_w = int(W * 0.22)
    gw, gh = glyph.size
    scale = target_w / gw
    glyph = glyph.resize((target_w, max(1, int(gh * scale))), Image.LANCZOS)

    # Vertically: glyph slightly above optical center, then text below.
    glyph_top = int(H * 0.34)
    canvas.paste(glyph, ((W - glyph.width) // 2, glyph_top), glyph)

    draw = ImageDraw.Draw(canvas)
    fraunces_path = FONTS / "Fraunces.ttf"
    inter_path = FONTS / "Inter.ttf"

    # Variable-font axis tuning: light Fraunces (wght=300, opsz=144), regular
    # Inter (wght=400, opsz=18).
    title_font = ImageFont.truetype(str(fraunces_path), size=140)
    try:
        title_font.set_variation_by_axes([300, 0, 144, 0])  # wght, WONK, opsz, SOFT
    except (AttributeError, OSError):
        pass

    tagline_font = ImageFont.truetype(str(inter_path), size=44)
    try:
        tagline_font.set_variation_by_axes([400, 18])  # wght, opsz
    except (AttributeError, OSError):
        pass

    # Title — slightly tracked-out feel via a kerning hack: draw normally,
    # Fraunces' default tracking already feels appropriately quiet.
    title = "Qahar-e-Hijr"
    tagline = "Time, since."

    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_w = title_bbox[2] - title_bbox[0]
    title_h = title_bbox[3] - title_bbox[1]
    title_y = glyph_top + glyph.height + 80
    draw.text(
        ((W - title_w) // 2 - title_bbox[0], title_y - title_bbox[1]),
        title,
        fill=INK,
        font=title_font,
    )

    tagline_bbox = draw.textbbox((0, 0), tagline, font=tagline_font)
    tagline_w = tagline_bbox[2] - tagline_bbox[0]
    tagline_y = title_y + title_h + 56
    draw.text(
        ((W - tagline_w) // 2 - tagline_bbox[0], tagline_y - tagline_bbox[1]),
        tagline,
        fill=INK_SECONDARY,
        font=tagline_font,
    )

    canvas.save(OUT_SPLASH, format="PNG", optimize=True)
    print(f"  wrote {OUT_SPLASH.relative_to(ROOT)}")


def build_favicon() -> None:
    """64x64 cream square with the glyph centered at ~70% — readability over
    fidelity at this size."""
    canvas = Image.new("RGBA", (64, 64), CREAM)
    glyph = trim_to_glyph(Image.open(SRC_TRANSPARENT).convert("RGBA"))
    fit_centered(glyph, canvas, glyph_fraction=0.70)
    canvas.save(OUT_FAVICON, format="PNG", optimize=True)
    print(f"  wrote {OUT_FAVICON.relative_to(ROOT)}")


def main() -> None:
    require_sources()
    print("Building app assets…")
    build_icon()
    build_adaptive()
    build_splash()
    build_favicon()
    print("Done.")


if __name__ == "__main__":
    main()
