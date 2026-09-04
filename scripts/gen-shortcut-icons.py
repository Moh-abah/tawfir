#!/usr/bin/env python3
"""Generate PWA shortcut icons (96x96) for Tawfir — Round 17.

4 branded glyphs on the app's teal (#005B82) rounded square:
  shortcut-home.png    — الرئيسية (house)
  shortcut-stores.png  — المتاجر (storefront)
  shortcut-orders.png  — طلباتي (receipt)
  shortcut-account.png — حسابي (person)

Drawn at 4x (384px) then downscaled with LANCZOS for crisp edges.
"""
from PIL import Image, ImageDraw

TEAL = (0, 91, 130, 255)        # #005B82 — brand primary
TEAL_DARK = (0, 59, 85, 255)    # #003B55 — subtle bottom gradient tone
WHITE = (255, 255, 255, 255)
GOLD = (255, 168, 0, 255)       # #FFA800 — brand accent

SIZE = 384          # draw size (4x of 96)
OUT = 96            # final size
ICONS_DIR = "/home/z/my-project/public/icons"

def base_canvas():
    """Rounded-square teal background with subtle vertical gradient."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    # vertical gradient teal -> teal-dark
    grad = Image.new("RGBA", (SIZE, SIZE))
    gd = ImageDraw.Draw(grad)
    for y in range(SIZE):
        t = y / SIZE
        r = int(TEAL[0] + (TEAL_DARK[0] - TEAL[0]) * t)
        g = int(TEAL[1] + (TEAL_DARK[1] - TEAL[1]) * t)
        b = int(TEAL[2] + (TEAL_DARK[2] - TEAL[2]) * t)
        gd.line([(0, y), (SIZE, y)], fill=(r, g, b, 255))
    # rounded-corner mask (full square for shortcut icons per Chrome spec)
    mask = Image.new("L", (SIZE, SIZE), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=64, fill=255)
    img.paste(grad, (0, 0), mask)
    return img, ImageDraw.Draw(img)

def save(img, name):
    out = img.resize((OUT, OUT), Image.LANCZOS)
    out.save(f"{ICONS_DIR}/{name}", "PNG")
    print(f"saved {name}")

def icon_home():
    img, d = base_canvas()
    # house: triangle roof + body with door notch
    d.polygon([(192, 88), (96, 172), (288, 172)], fill=WHITE)
    d.rectangle([120, 172, 264, 296], fill=WHITE)
    # door cut (teal)
    d.rounded_rectangle([166, 216, 218, 296], radius=10, fill=TEAL)
    save(img, "shortcut-home.png")

def icon_stores():
    img, d = base_canvas()
    # storefront: awning (striped) + body
    # body
    d.rounded_rectangle([104, 168, 280, 300], radius=14, fill=WHITE)
    # door + window (teal cutouts)
    d.rounded_rectangle([128, 208, 192, 300], radius=8, fill=TEAL)
    d.rounded_rectangle([210, 208, 256, 250], radius=8, fill=TEAL)
    # awning: 4 scallops aligned exactly to body width (104→280)
    w = (280 - 104) / 4
    for i in range(4):
        x0 = 104 + i * w
        col = WHITE if i % 2 == 0 else GOLD
        d.pieslice([x0, 120, x0 + w, 200], 0, 180, fill=col)
    # awning top bar aligned to body
    d.rectangle([104, 112, 280, 134], fill=WHITE)
    save(img, "shortcut-stores.png")

def icon_orders():
    img, d = base_canvas()
    # receipt: rounded rect with zigzag bottom + text lines
    d.rounded_rectangle([116, 84, 268, 288], radius=16, fill=WHITE)
    # zigzag bottom (teal triangles)
    zx = 116
    zw = 19.0
    for i in range(8):
        d.polygon([
            (zx + i * zw, 288),
            (zx + (i + 1) * zw, 288),
            (zx + (i + 0.5) * zw, 306),
        ], fill=TEAL_DARK)
    # text lines (teal)
    for i, wpx in enumerate([104, 84, 94]):
        y = 128 + i * 44
        d.rounded_rectangle([148, y, 148 + wpx, y + 18], radius=9, fill=TEAL)
    save(img, "shortcut-orders.png")

def icon_account():
    img, d = base_canvas()
    # person: circle head + shoulders
    d.ellipse([142, 92, 242, 192], fill=WHITE)
    # shoulders (half-ellipse)
    d.pieslice([104, 208, 280, 376], 180, 360, fill=WHITE)
    save(img, "shortcut-account.png")

icon_home()
icon_stores()
icon_orders()
icon_account()
print("all shortcut icons generated")
