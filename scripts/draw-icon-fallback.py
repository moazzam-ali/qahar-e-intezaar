#!/usr/bin/env python3
"""
Programmatic fallback for the Qahar-e-Hijr crescent + dot mark.

Used when the user-generated source artwork hasn't been dropped into
`assets/source/` yet. Produces both the cream-bg and transparent variants
that `scripts/build-assets.py` reads.

The mark: a thin terracotta crescent (open C-curve) with a small filled
terracotta dot to its lower right, suggesting separation. It's a clean,
minimalist take — not a hand-inked AI-art replica — but it captures the
essential identity and lets every other asset (splash, adaptive icon,
favicon) flow from it.

Run:  python3 scripts/draw-icon-fallback.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "source"

# Brand
CREAM = (251, 246, 238, 255)
# Slightly warmer than the strict brand terracotta — matches the AI-generated
# reference, which read closer to #C58A6B than to the chrome accent #B8826B.
TERRACOTTA = (197, 138, 107, 255)

CANVAS = 1536  # render large, downscale for crisp edges


def make_crescent_mask(size: int) -> Image.Image:
    """A crescent moon as a single-channel alpha mask.

    Built by carving an offset inner circle out of an outer disk. The inner
    circle is shifted to the upper-right and made *slightly* larger so the
    crescent has a graceful, slimmer waist on top — closer to the calligraphic
    feel of the source artwork than a strictly geometric crescent.
    """
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)

    cx, cy = size / 2, size / 2

    # Outer disk: ~40% of canvas radius — leaves comfortable margin.
    outer_r = size * 0.30

    # The "stroke" of the crescent: how thick the visible part of the moon is.
    # Smaller = thinner, more elegant. The reference sits around 14–16% of r.
    stroke = outer_r * 0.18

    # Carve mask: inner circle shifted right + slightly up, slightly larger
    # than the outer minus stroke, so the crescent tapers at the tips.
    inner_offset_x = stroke * 1.45
    inner_offset_y = -stroke * 0.10
    inner_r = outer_r - stroke

    draw.ellipse(
        [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r],
        fill=255,
    )
    draw.ellipse(
        [
            cx - inner_r + inner_offset_x,
            cy - inner_r + inner_offset_y,
            cx + inner_r + inner_offset_x,
            cy + inner_r + inner_offset_y,
        ],
        fill=0,
    )

    # Subtle softening so edges don't look CAD-stamped.
    return mask.filter(ImageFilter.GaussianBlur(radius=1.2))


def make_dot_mask(size: int) -> Image.Image:
    """The small companion dot, positioned to the lower-right of the crescent
    opening — it reads as a separated, distant counterpart."""
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)

    cx, cy = size / 2, size / 2
    outer_r = size * 0.30
    stroke = outer_r * 0.18

    dot_r = stroke * 0.85
    # Place the dot below and to the right of the crescent's opening.
    dot_cx = cx + outer_r * 0.95
    dot_cy = cy + outer_r * 0.55

    draw.ellipse(
        [dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r],
        fill=255,
    )
    return mask.filter(ImageFilter.GaussianBlur(radius=1.0))


def render(transparent: bool) -> Image.Image:
    bg = (0, 0, 0, 0) if transparent else CREAM
    canvas = Image.new("RGBA", (CANVAS, CANVAS), bg)

    crescent_mask = make_crescent_mask(CANVAS)
    dot_mask = make_dot_mask(CANVAS)

    # Combine alphas: per-pixel max so they merge cleanly without dimming.
    combined = ImageChops.lighter(crescent_mask, dot_mask)

    paint = Image.new("RGBA", (CANVAS, CANVAS), TERRACOTTA)
    canvas.paste(paint, (0, 0), combined)
    return canvas


def main() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    for name, transparent in [
        ("icon-cream.png", False),
        ("icon-transparent.png", True),
    ]:
        out = render(transparent)
        out.save(SOURCE / name, format="PNG", optimize=True)
        print(f"  wrote {(SOURCE / name).relative_to(ROOT)}")
    print("Done — now run: python3 scripts/build-assets.py")


if __name__ == "__main__":
    main()
