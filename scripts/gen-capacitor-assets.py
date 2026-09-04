#!/usr/bin/env python3
"""
Generate Tawfir-branded Capacitor assets:
  - resources/icon.png  (1024x1024) — app launcher icon
  - resources/splash.png (2732x2732) — launch splash screen

Design:
  - Background: vertical gradient #003B55 → #005B82 (Tawfir teal)
  - Foreground: Arabic letter "ت" (Tawfir's first letter) in #C9A23A (gold accent)
  - Icon: rounded-square mask (Android adaptive icon safe-zone)
  - Splash: centered large "ت" mark on solid gradient

Uses Cairo-Bold.ttf from public/fonts (no system font dependency).
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_PATH = os.path.join(ROOT, "public", "fonts", "Cairo-Black.ttf")

TEAL_DARK = (0, 59, 85)    # #003B55
TEAL = (0, 91, 130)        # #005B82
GOLD = (201, 162, 58)      # #C9A23A
WHITE = (248, 249, 250)    # #F8F9FA

OUT_DIR = os.path.join(ROOT, "resources")
os.makedirs(OUT_DIR, exist_ok=True)


def vertical_gradient(size, top_color, bottom_color):
    """Create a vertical gradient image."""
    img = Image.new("RGB", (size, size), top_color)
    pixels = img.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * t)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * t)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * t)
        for x in range(size):
            pixels[x, y] = (r, g, b)
    return img


def draw_tah_mark(img, color, size_ratio=0.55):
    """Draw the Arabic letter 'ت' centered on the image."""
    w, h = img.size
    font_size = int(h * size_ratio)
    font = ImageFont.truetype(FONT_PATH, font_size)

    # Measure the glyph
    draw = ImageDraw.Draw(img)
    try:
        bbox = draw.textbbox((0, 0), "ت", font=font, direction="rtl")
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
    except Exception:
        bbox = draw.textbbox((0, 0), "ت", font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]

    # Center (account for the glyph's internal bbox offset)
    x = (w - text_w) / 2 - bbox[0]
    y = (h - text_h) / 2 - bbox[1]

    # Draw a soft white circle behind the mark for contrast (icon only)
    draw.text((x, y), "ت", font=font, fill=color, direction="rtl", language="ar")


def rounded_mask(size, radius_ratio=0.22):
    """Create a rounded-rectangle alpha mask."""
    img = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=r, fill=255)
    return img


def make_icon():
    """1024x1024 app icon: gradient + rounded + gold 'ت' mark."""
    size = 1024
    bg = vertical_gradient(size, TEAL_DARK, TEAL)
    # Apply rounded mask (for legacy non-adaptive display)
    mask = rounded_mask(size)
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(bg, (0, 0), mask)
    # Draw the gold mark on top
    draw_tah_mark(icon, GOLD, size_ratio=0.58)
    out = os.path.join(OUT_DIR, "icon.png")
    icon.save(out, "PNG", optimize=True)
    print(f"  icon: {out} ({os.path.getsize(out)} bytes)")


def make_splash():
    """2732x2732 splash: gradient background + large white 'ت' mark."""
    size = 2732
    bg = vertical_gradient(size, TEAL_DARK, TEAL)
    # White circle behind the mark for subtle contrast
    draw = ImageDraw.Draw(bg)
    cx, cy = size // 2, size // 2
    r = int(size * 0.18)
    draw.ellipse(
        (cx - r, cy - r, cx + r, cy + r),
        fill=(255, 255, 255, 30),
    )
    # Re-paste a semi-transparent white circle
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, 25))
    bg_rgba = bg.convert("RGBA")
    bg_rgba = Image.alpha_composite(bg_rgba, overlay)
    bg = bg_rgba.convert("RGB")
    # Draw the gold mark
    draw_tah_mark(bg, GOLD, size_ratio=0.30)
    out = os.path.join(OUT_DIR, "splash.png")
    bg.save(out, "PNG", optimize=True)
    print(f"  splash: {out} ({os.path.getsize(out)} bytes)")


def make_foreground():
    """1024x1024 adaptive icon foreground: transparent + gold 'ت' mark
    centered within the safe zone (inner 66%)."""
    size = 1024
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_tah_mark(fg, GOLD, size_ratio=0.40)
    out = os.path.join(OUT_DIR, "icon-foreground.png")
    fg.save(out, "PNG", optimize=True)
    print(f"  fg: {out} ({os.path.getsize(out)} bytes)")


def make_background():
    """1024x1024 adaptive icon background: gradient (full bleed)."""
    size = 1024
    bg = vertical_gradient(size, TEAL_DARK, TEAL)
    out = os.path.join(OUT_DIR, "icon-background.png")
    bg.save(out, "PNG", optimize=True)
    print(f"  bg: {out} ({os.path.getsize(out)} bytes)")


if __name__ == "__main__":
    print("Generating Tawfir Capacitor assets...")
    make_icon()
    make_splash()
    make_foreground()
    make_background()
    print("Done.")
