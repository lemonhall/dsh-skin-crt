"""Wire the Fusion Pixel bitmap font into the CRT skin.

- copies the woff2 and its OFL licence into the skin's assets (redistribution
  requires the licence text to travel with the font);
- prepends an `@font-face` to skin.css. At-rules without selectors pass the skin
  pipeline unchanged (the skin already ships @keyframes), so a local relative
  font URL is the supported way to bring a typeface;
- points the single monospace token at it, with the old stack as fallback.
"""
from pathlib import Path

SKIN = Path(r'E:\development\dsh-skin-crt\skins\crt-phosphor')
VENDOR = Path(r'E:\development\dsh-skin-crt\_vendor')
FONT = VENDOR / 'fusion-pixel-12px-monospaced-zh_hans.ttf.woff2'
CSS = SKIN / 'skin.css'

# 1. assets
target_font = SKIN / 'assets' / 'fusion-pixel-12px-monospaced.woff2'
target_font.write_bytes(FONT.read_bytes())

import io
import zipfile

with zipfile.ZipFile(VENDOR / 'fusion-pixel-12px-monospaced-woff2.zip') as bundle:
    licence = bundle.read('OFL.txt').decode('utf-8')
(SKIN / 'assets' / 'FUSION-PIXEL-OFL.txt').write_text(licence, encoding='utf-8')
print(f'font: {target_font.stat().st_size} bytes; licence: {len(licence)} chars')

# 2. the @font-face block
FACE = '''/**
 * Fusion Pixel 12px monospaced (zh_hans) - a bitmap-style CJK typeface.
 *
 * Why this and not the classic IBM VGA / Px437 DOS bitmap font: those cover
 * CP437 only (Latin plus box drawing), so every Chinese glyph would fall back to
 * a modern face and the dot-matrix illusion would break. The DOS-era answer for
 * Chinese was a 16x16 dot-matrix font (HZK16 and friends), which has no webfont
 * form; Fusion Pixel is the modern OFL-1.1 equivalent and carries Latin and
 * Simplified Chinese on one grid. Licence text ships in assets/FUSION-PIXEL-OFL.txt.
 */
@font-face {
  font-family: "Fusion Pixel 12px";
  src: url("assets/fusion-pixel-12px-monospaced.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  size-adjust: 100%;
}

'''

css = CSS.read_text(encoding='utf-8')
if '@font-face' not in css:
    css = FACE + css
    print('@font-face inserted')
else:
    print('@font-face already present')

css = css.replace(
    '--dsw-font-family: "Consolas", "DejaVu Sans Mono", "Lucida Console", "Courier New", monospace;',
    '/* DOS-style dot matrix first; the modern monospace stack stays as fallback\n'
    '     so a missing font file degrades to something readable instead of tofu */\n'
    '  --dsw-font-family: "Fusion Pixel 12px", "Consolas", "DejaVu Sans Mono", "Lucida Console", monospace;',
    1,
)
CSS.write_text(css, encoding='utf-8')
print('font stack ->', [l for l in css.splitlines() if '--dsw-font-family:' in l][0].strip())
