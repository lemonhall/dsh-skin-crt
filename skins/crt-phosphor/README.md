# Phosphor CRT

English | [中文](README.zh.md)

A CRT skin for the dsh web GUI: phosphor green on smoked glass, a dot-matrix
typeface covering Latin and Chinese, baked scanlines and a baked vignette, and
the two netrunner portraits pinned to the input card's edges.

| | |
| --- | --- |
| id | `crt-phosphor` |
| version | 0.1.0 |
| manifest | v2 |
| typeface | Fusion Pixel 12px monospaced (OFL-1.1, bundled) |
| licence | CC BY-NC-SA 4.0 (unofficial fan artwork) |

## Preview

Light theme:

![light](preview/light.jpg)

Dark theme:

![dark](preview/dark.jpg)

Both are 1440x900 JPEG q85 from the market's own facade renderer.

## What it is

- `skin.css` remaps the official tokens: every label and border becomes phosphor
  green, every surface near-black green glass, and all 31
  `--dsw-font-*-font-family` tokens point at the bundled dot-matrix face, which is
  declared with a local `@font-face` (local relative URLs pass the safety
  pipeline; remote ones do not).
- `patches.css` draws the tube: vignette and a slow breathing luminance on
  `#root::before`, a faint bloom and a rare flicker on `#root::after`, phosphor
  bloom plus a whisker of chromatic fringe on text, and the two portraits on
  `body::before` / `body::after`.
- Scanlines are baked into the artwork on purpose: drawn in CSS at a 3px period
  they beat against the device pixel ratio and read as a few thick bands sweeping
  the screen.
- No `hooks.mjs`: the market preview renderer never runs skin hooks, so the tube
  is declarative on purpose.

## The portraits

They anchor to `[data-composer-card]` (`left: anchor(--crt-composer left)` plus
`translate: -100% 0` for the left one), so both follow the sidebar and the details
pane without measuring anything, and they paint at `z-index: 900` - above the
shell's layers (15-40), below the whale widget's `9999`.

`--crt-portrait-filter` is the single knob between natural colour with a phosphor
rim and a full green ghost duotone.

## Known limitations

- Presentation only: the skin mutates browser styles and never touches a model
  request.
- The face is designed on a 12px grid, so the shell's odd sizes (11, 13, 14, 16)
  are interpolated slightly.
- `patches.css` matches a few CSS-module hash class names, which an official
  rebuild could rename (`dsh-skin validate` warns about this by design).
- The font is 903 KB of the skin's ~1.3 MB; subsetting would cut that roughly in
  half at the cost of rare characters.

The full write-up is in the project repository under `docs/CRT-TECHNIQUE.md`.
