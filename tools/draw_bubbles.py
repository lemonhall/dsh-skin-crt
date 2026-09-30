"""Fetch the pixel TTF and draw the two comic speech bubbles.

The skin displays each bubble as an extra background layer on the portrait
pseudo-element, so the bubbles are plain raster assets: rounded plate, green
border, a tail pointing down at the head, and pixel-font text drawn at 4x so it
stays crisp when the layer is scaled down to ~190 CSS px.
"""
import io
import urllib.request
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

PROXY = 'http://127.0.0.1:7897'
URL = ('https://github.com/TakWolf/fusion-pixel-font/releases/download/2026.09.25/'
       'fusion-pixel-font-12px-monospaced-ttf-v2026.09.25.zip')
VENDOR = Path(r'E:\development\dsh-skin-crt\_vendor')
ASSETS = Path(r'E:\development\dsh-skin-crt\skins\crt-phosphor\assets')

opener = urllib.request.build_opener(urllib.request.ProxyHandler({'http': PROXY, 'https': PROXY}))
opener.addheaders = [('User-Agent', 'Mozilla/5.0')]

ttf = VENDOR / 'fusion-pixel-12px-monospaced-zh_hans.ttf'
if not ttf.exists():
    print('downloading the ttf bundle...')
    with opener.open(URL, timeout=300) as response:
        payload = response.read()
    with zipfile.ZipFile(io.BytesIO(payload)) as bundle:
        name = next(n for n in bundle.namelist() if n.endswith('zh_hans.ttf'))
        ttf.write_bytes(bundle.read(name))
    print(f'ttf: {name} -> {ttf.stat().st_size} bytes')

SCALE = 4                      # 12px design grid -> 48px, exact multiple
FONT = ImageFont.truetype(str(ttf), 12 * SCALE)
PAD_X, PAD_Y = 26 * SCALE, 18 * SCALE
LINE_GAP = 10 * SCALE
RADIUS = 18 * SCALE
BORDER = 3 * SCALE
INK = (214, 255, 233, 255)
PLATE = (4, 22, 14, 238)
EDGE = (125, 255, 192, 255)
GLOW = (61, 255, 158, 150)

BUBBLES = {
    'bubble-left.webp': ['你好呀，', '柠檬叔'],
    'bubble-right.webp': ['夜城信号', '良好'],
}


def measure(draw, lines):
    widths, heights = [], []
    for line in lines:
        box = draw.textbbox((0, 0), line, font=FONT)
        widths.append(box[2] - box[0])
        heights.append(box[3] - box[1])
    return max(widths), heights, LINE_GAP


for filename, lines in BUBBLES.items():
    probe = ImageDraw.Draw(Image.new('RGBA', (8, 8)))
    text_w, heights, gap = measure(probe, lines)
    line_h = max(heights)
    text_h = line_h * len(lines) + gap * (len(lines) - 1)

    plate_w = text_w + PAD_X * 2
    plate_h = text_h + PAD_Y * 2
    tail_h = 16 * SCALE
    canvas_w = plate_w + 24 * SCALE
    canvas_h = plate_h + tail_h + 24 * SCALE

    image = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    plate = (12 * SCALE, 12 * SCALE, 12 * SCALE + plate_w, 12 * SCALE + plate_h)
    tail_x = plate[0] + int(plate_w * 0.42)

    # glow under the plate: a blurred copy of the plate is what reads as "lit"
    glow_layer = Image.new('RGBA', image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    glow_draw.rounded_rectangle(plate, radius=RADIUS, fill=GLOW)
    glow_draw.polygon(
        [(tail_x - 12 * SCALE, plate[3] - 2), (tail_x + 12 * SCALE, plate[3] - 2),
         (tail_x, plate[3] + tail_h)],
        fill=GLOW,
    )
    image.alpha_composite(glow_layer.filter(ImageFilter.GaussianBlur(7 * SCALE)))
    draw = ImageDraw.Draw(image)

    # plate + tail + border
    draw.rounded_rectangle(plate, radius=RADIUS, fill=PLATE, outline=EDGE, width=BORDER)
    draw.polygon(
        [(tail_x - 11 * SCALE, plate[3] - BORDER), (tail_x + 11 * SCALE, plate[3] - BORDER),
         (tail_x, plate[3] + tail_h)],
        fill=PLATE,
    )
    draw.line(
        [(tail_x - 11 * SCALE, plate[3] - BORDER), (tail_x, plate[3] + tail_h - 2)],
        fill=EDGE, width=BORDER,
    )
    draw.line(
        [(tail_x + 11 * SCALE, plate[3] - BORDER), (tail_x, plate[3] + tail_h - 2)],
        fill=EDGE, width=BORDER,
    )

    # text, left aligned inside the padding
    y = plate[1] + PAD_Y
    for line in lines:
        draw.text((plate[0] + PAD_X, y), line, font=FONT, fill=INK)
        y += line_h + gap

    target = ASSETS / filename
    image.save(target, 'WEBP', quality=95, method=6)
    print(f'{filename}: {image.size} -> {target.stat().st_size} bytes')
