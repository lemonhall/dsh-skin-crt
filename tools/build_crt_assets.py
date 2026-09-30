"""Build CRT phosphor assets: green duotone + halation + scanlines + vignette.

Sources are this machine's own Lucy scenes (already paid for), so the CRT skin
needs no new generations: the transform is entirely local.

Pipeline per image:
  1. luminance -> gamma/contrast so the city keeps detail in the green ramp;
  2. map luminance through a P1-phosphor ramp (near-black green -> bright mint);
  3. halation: blur a copy of the bright areas and screen-blend it back, which is
     what makes a phosphor screen look like it glows;
  4. scanlines: a 1-in-3 darkening row, subtle enough to survive webp;
  5. vignette + a touch of grain for the tube face.

Outputs land in E:\\development\\dsh-skin-crt\\skins\\crt-phosphor\\assets.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Path(r'E:\development\dsh-skin-lucy\skins\lucy-nightsignal\assets')
OUT = Path(r'E:\development\dsh-skin-crt\skins\crt-phosphor\assets')
OUT.mkdir(parents=True, exist_ok=True)

# P1 phosphor ramps: dark end -> mid -> hot core
RAMPS = {
    'light': np.array([[4, 18, 10], [22, 96, 54], [126, 255, 190]], dtype=np.float64),
    'dark': np.array([[2, 10, 6], [14, 74, 42], [96, 240, 176]], dtype=np.float64),
}
SCANLINE_STRENGTH = {'light': 0.16, 'dark': 0.20}
VIGNETTE_STRENGTH = {'light': 0.30, 'dark': 0.38}


def ramp_map(lum: np.ndarray, ramp: np.ndarray) -> np.ndarray:
    """Map a 0..1 luminance plane through a 3-stop colour ramp."""
    stops = np.array([0.0, 0.55, 1.0])
    out = np.empty(lum.shape + (3,), dtype=np.float64)
    for channel in range(3):
        out[..., channel] = np.interp(lum, stops, ramp[:, channel])
    return out


def build(theme: str) -> None:
    source = SRC / f'scene-{theme}.webp'
    image = Image.open(source).convert('RGB')
    arr = np.asarray(image).astype(np.float64) / 255.0

    # 1. luminance with a gentle S-curve so midtones stay readable in green
    lum = 0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]
    lum = np.clip(lum, 0, 1)
    lum = lum ** 0.86
    lum = np.clip((lum - 0.5) * 1.12 + 0.5, 0, 1)

    # 2. duotone
    rgb = ramp_map(lum, RAMPS[theme])

    # 3. halation: glow the highlights and screen-blend
    bright = np.clip((lum - 0.45) / 0.55, 0, 1)
    glow_src = Image.fromarray((bright * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(14))
    glow = np.asarray(glow_src).astype(np.float64) / 255.0
    glow_rgb = ramp_map(np.clip(glow * 1.15, 0, 1), RAMPS[theme]) / 255.0
    rgb = 1 - (1 - rgb / 255.0) * (1 - glow_rgb * 0.55)
    rgb = np.clip(rgb, 0, 1)

    # 4. scanlines (1 dark row every 3, plus a very faint wider banding)
    height = rgb.shape[0]
    rows = np.arange(height)
    line = np.where(rows % 3 == 0, 1.0 - SCANLINE_STRENGTH[theme], 1.0)
    band = 1.0 - 0.04 * (0.5 + 0.5 * np.sin(rows / 47.0))
    rgb *= (line * band)[:, None, None]

    # 5. vignette + grain
    h, w = rgb.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    radius = np.sqrt(((xx - cx) / cx) ** 2 + ((yy - cy) / cy) ** 2)
    vignette = 1.0 - VIGNETTE_STRENGTH[theme] * np.clip((radius - 0.55) / 0.75, 0, 1) ** 1.6
    rgb *= vignette[..., None]
    rng = np.random.default_rng(20261001)
    rgb += (rng.random(rgb.shape) - 0.5) * 0.012

    out = Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8), 'RGB')
    out = out.filter(ImageFilter.GaussianBlur(0.3))
    target = OUT / f'scene-{theme}.webp'
    out.save(target, 'WEBP', quality=90, method=6)
    print(f'{theme}: {image.size} -> {out.size}  {target.stat().st_size} bytes')


for theme_name in ('light', 'dark'):
    build(theme_name)
