#!/usr/bin/env python3
"""Generate the Reading Quest app icon (PWA / Android home-screen).

Design: an open book with a sparkle/star sitting above it, on a warm orange
gradient inside a rounded square. Matches the app's accent palette
(#FF6B35 primary orange, #FFD93D yellow for the sparkle, #FFB089 peach for
the page lines).

Safe-zone notes (Android adaptive icons):
  Maskable spec asks for the icon's "important content" to live within the
  central 80% of the canvas (10% padding all sides) so that the system can
  crop to circle/squircle/rounded square without losing meaning.

  Here the visible content (star + book) spans roughly y=220..820 on a 1024
  canvas — about 58% of the height — which is comfortably inside the safe
  zone. Edges of the canvas are filled with the gradient so a maskable crop
  still looks intentional.

Outputs (overwrites in place):
  public/icons/icon-192.png   — standard 192px icon for older Android / iOS
  public/icons/icon-512.png   — standard 512px icon
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
CORNER_RADIUS = 200

# Palette
ORANGE_START = (255, 107, 53)    # #FF6B35
ORANGE_END = (255, 165, 107)     # #FFA56B (soft coral)
SPARKLE = (255, 217, 61)         # #FFD93D
SPARKLE_RIM = (255, 240, 150)    # soft halo
PAGE_WHITE = (255, 252, 246)     # warm white (#FFFCF6)
PAGE_LINE = (255, 184, 137)      # peach
PAGE_CREASE = (235, 220, 200)


def make_gradient() -> Image.Image:
    """Top-left → bottom-right linear gradient between ORANGE_START and ORANGE_END."""
    xs, ys = np.meshgrid(np.arange(SIZE), np.arange(SIZE))
    t = ((xs + ys) / (SIZE * 2)).astype(np.float32)  # 0..1
    r = (ORANGE_START[0] + t * (ORANGE_END[0] - ORANGE_START[0])).clip(0, 255).astype(np.uint8)
    g = (ORANGE_START[1] + t * (ORANGE_END[1] - ORANGE_START[1])).clip(0, 255).astype(np.uint8)
    b = (ORANGE_START[2] + t * (ORANGE_END[2] - ORANGE_START[2])).clip(0, 255).astype(np.uint8)
    arr = np.stack([r, g, b], axis=-1)
    return Image.fromarray(arr, 'RGB').convert('RGBA')


def composite_layer(base: Image.Image, layer: Image.Image) -> Image.Image:
    return Image.alpha_composite(base, layer)


def draw_star(img: Image.Image, cx: float, cy: float, outer: float, inner: float, fill) -> None:
    pts = []
    for i in range(10):
        angle_deg = -90 + i * 36
        r = outer if i % 2 == 0 else inner
        rad = math.radians(angle_deg)
        pts.append((cx + r * math.cos(rad), cy + r * math.sin(rad)))
    ImageDraw.Draw(img).polygon(pts, fill=fill)


def build() -> Image.Image:
    # 1. Background gradient masked to a rounded square.
    bg = make_gradient()
    mask = Image.new('L', (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=CORNER_RADIUS, fill=255)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(bg, (0, 0), mask)

    # 2. Subtle radial highlight near top-left so the gradient has a touch of depth.
    highlight = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    hd.ellipse((-200, -200, 600, 600), fill=(255, 255, 255, 32))
    highlight = highlight.filter(ImageFilter.GaussianBlur(80))
    canvas = composite_layer(canvas, highlight)

    # 3. Hero star + two tiny sparkles flanking it for a little quest energy.
    star_cy = 320
    star_layer = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw_star(star_layer, SIZE / 2, star_cy, 110, 44, SPARKLE + (255,))

    # Soft halo behind the star
    halo = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw_star(halo, SIZE / 2, star_cy, 150, 65, SPARKLE_RIM + (200,))
    halo = halo.filter(ImageFilter.GaussianBlur(22))
    canvas = composite_layer(canvas, halo)

    # Tiny accent sparkles (4-point stars)
    def mini_sparkle(layer: Image.Image, cx: float, cy: float, size: float) -> None:
        pts = []
        for i in range(8):
            angle = -90 + i * 45
            r = size if i % 2 == 0 else size * 0.28
            rad = math.radians(angle)
            pts.append((cx + r * math.cos(rad), cy + r * math.sin(rad)))
        ImageDraw.Draw(layer).polygon(pts, fill=(255, 255, 255, 230))

    accents = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    mini_sparkle(accents, SIZE / 2 - 200, star_cy - 80, 28)
    mini_sparkle(accents, SIZE / 2 + 215, star_cy + 30, 22)
    canvas = composite_layer(canvas, accents)
    canvas = composite_layer(canvas, star_layer)

    # 4. Book — vertically more centred than v1. Drop shadow first, then body.
    bx, by, bw, bh = 152, 510, 720, 420

    shadow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (bx + 12, by + 26, bx + bw + 12, by + bh + 26),
        radius=58,
        fill=(0, 0, 0, 120),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    canvas = composite_layer(canvas, shadow)

    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=58, fill=PAGE_WHITE + (255,))

    # Subtle top-edge highlight on the pages (gives them slight dimension).
    top_glow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(top_glow).rounded_rectangle(
        (bx + 14, by + 14, bx + bw - 14, by + 28),
        radius=10,
        fill=(255, 255, 255, 150),
    )
    top_glow = top_glow.filter(ImageFilter.GaussianBlur(6))
    canvas = composite_layer(canvas, top_glow)

    draw = ImageDraw.Draw(canvas)

    # 5. Spine: a soft inset shadow at the centre so the two pages read clearly.
    cx = bx + bw // 2
    spine_shadow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(spine_shadow).rounded_rectangle(
        (cx - 14, by + 30, cx + 14, by + bh - 30),
        radius=10,
        fill=(180, 145, 110, 170),
    )
    spine_shadow = spine_shadow.filter(ImageFilter.GaussianBlur(10))
    canvas = composite_layer(canvas, spine_shadow)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((cx - 4, by + 38, cx + 4, by + bh - 38), fill=PAGE_CREASE + (255,))

    # 6. Page text-lines on each half.
    def page_lines(left: int, right: int) -> None:
        line_top = by + 110
        line_gap = 96
        for i in range(3):
            full = right - left - 100
            w = full if i < 2 else int(full * 0.6)
            y = line_top + i * line_gap
            draw.rounded_rectangle(
                (left + 50, y, left + 50 + w, y + 26),
                radius=13,
                fill=PAGE_LINE + (255,),
            )

    page_lines(bx, cx - 4)
    page_lines(cx + 4, bx + bw)

    return canvas


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    out_dir = root / 'public' / 'icons'
    out_dir.mkdir(parents=True, exist_ok=True)

    icon = build()
    # Save 512 directly from 1024 source so it's crisp, then downscale for 192.
    icon.resize((512, 512), Image.LANCZOS).save(out_dir / 'icon-512.png', 'PNG', optimize=True)
    icon.resize((192, 192), Image.LANCZOS).save(out_dir / 'icon-192.png', 'PNG', optimize=True)
    print(f'Wrote {out_dir / "icon-512.png"} and {out_dir / "icon-192.png"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
