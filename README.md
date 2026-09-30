# Phosphor CRT — a DSH skin

English | [中文](README.zh.md)

Turns the DeepSeek Harness web GUI into an old phosphor tube: green monospace
text on smoked glass, a dot-matrix typeface that covers Chinese as well as Latin,
the city outside rendered as P1 phosphor, and the two netrunner portraits still
pinned to the input card's left and right edges.

| | |
| --- | --- |
| skin id | `crt-phosphor` |
| version | 0.1.0 |
| manifest | v2 (skin-center contract) |
| built against | DSH 0.2.0-rc.2 desktop + `@linxin666/dsh-client-ui-skin-center` 0.4.3 |
| typeface | Fusion Pixel 12px monospaced (OFL-1.1, bundled) |
| licence | CC BY-NC-SA 4.0 (unofficial fan artwork) |

## What it looks like

Light theme — the same tube, lit a little harder:

![light theme](skins/crt-phosphor/preview/light.jpg)

Dark theme — deep glass, brighter phosphor:

![dark theme](skins/crt-phosphor/preview/dark.jpg)

Both are 1440x900 JPEG q85 rendered through the market's own facade renderer, the
same static renderer the Workshop gallery uses.

## Install

```powershell
git clone https://github.com/lemonhall/dsh-skin-crt
Copy-Item -Recurse dsh-skin-crt\skins\crt-phosphor "$env:USERPROFILE\.dsh\skins\"
```

Then Settings -> Skin Center and pick `磷光 CRT`. The Skin Center rescans
`$DSH_HOME/skins` while the card is open, so no reload and no restart are needed
when you switch inside the GUI.

## What actually makes it a CRT

Four levers, in the order they matter:

1. **The scene is the lit phosphor.** `tools/build_crt_assets.py` takes a
   character-free night city, maps its luminance through a three-stop P1 phosphor
   ramp, screen-blends a blurred highlight copy back in for halation, then bakes
   scanlines, a vignette and a touch of grain. Baking beats drawing: CSS scanlines
   at a 3px period beat against the device pixel ratio and read as a few thick
   bands sweeping the screen (see `docs/CRT-TECHNIQUE.md`).
2. **One token layer recolours and retypes the whole shell.** `skin.css` remaps
   the official `--dsw-*` tokens: phosphor greens for every label and border,
   near-black green glass for every surface, and all 31 `--dsw-font-*-font-family`
   tokens pointed at the bundled dot-matrix face.
3. **Three free-selector layers draw the tube.** `patches.css` adds the vignette
   and a slow breathing luminance on `#root::before`, a faint bloom and a rare
   shallow flicker on `#root::after`, and phosphor bloom plus a whisker of
   chromatic fringe on the text.
4. **The portraits ride the input card.** `body::before` / `body::after` anchor to
   `[data-composer-card]` (`left: anchor(--crt-composer left)` plus
   `translate: -100% 0` for the left one), so both follow the sidebar and the
   details pane without measuring anything. They paint at `z-index: 900`: above
   every shell surface, below the whale widget's `9999`.

## The Chinese problem, and the font choice

The classic DOS look comes from bitmap fonts such as IBM VGA 8x16 (the
Ultimate Oldschool PC Font Pack). Those cover **CP437 only** — Latin and box
drawing. Point the whole GUI at one and every Chinese glyph falls through to a
modern fallback face, which breaks the illusion exactly where it matters here,
because this GUI is mostly Chinese.

The DOS-era answer for Chinese was a 16x16 dot-matrix font (HZK16 and friends),
a raw bitmap dump with no webfont form. The practical modern equivalent is
**Fusion Pixel 12px monospaced** ([TakWolf/fusion-pixel-font](https://github.com/TakWolf/fusion-pixel-font),
OFL-1.1), which puts Latin and Simplified Chinese on one pixel grid. Its licence
text travels with the skin in `assets/FUSION-PIXEL-OFL.txt`.

Two facts worth knowing about shipping a font inside a skin:

- `@font-face` passes the skin-center CSS safety pipeline as long as the URL is
  local and relative (`url("assets/…woff2")`); remote and protocol URLs are
  rejected. `@keyframes` already proved at-rules without selectors survive.
- The face is 903 KB of the skin's ~1.3 MB. Subsetting to the common hanzi
  would cut it roughly in half; the full set keeps rare characters correct.

## Repository layout

```
skins/crt-phosphor/          the skin itself — the directory that gets installed
  skin.json                  manifest v2 (+ the phosphor scene as backgroundMedia)
  skin.css                   L1 tokens: palette, all 31 font-family tokens, @font-face
  patches.css                L3: tube layers, phosphor bloom, the two portraits
  assets/                    scenes, portraits, the font and its OFL licence
  preview/                   light.jpg + dark.jpg, 1440x900 JPEG q85
  README.md / README.zh.md   the skin's own bilingual readme
docs/CRT-TECHNIQUE.md        layer plan, the moire lesson, pipeline facts
tools/build_crt_assets.py    luminance -> P1 ramp, halation, baked scanlines
tools/wire_pixel_font.py     fetch-free wiring of the bundled face into skin.css
tools/inject_skin_into_facade.py  inject any skin into the market facade renderer
tools/capture_facade.cjs     render the 1440x900 previews with Playwright
_vendor/                     downloaded upstream archives (not committed)
```

## Two variants in this repository

`skins/crt-phosphor/` in this repository carries the optional interactive
`hooks.mjs`: click either girl and she answers with a random line (the bubble is
DOM, so it sits above her head at any text length). The Workshop submission ships
the same skin **without** hooks, because the skin contract reserves `facets.client`
for built-in skins and explicitly keeps it out of out-of-repo extensions.

Locally, hooks need `dsh-market.provenance.json` in the installed directory; see
`tools/make-local-provenance.mjs` and `docs/CRT-TECHNIQUE.md` (Lesson 6) for what
that file does and does not mean.

## Verification

| gate | result |
| --- | --- |
| `node scripts/dsh-skin.cjs validate skins/crt-phosphor` | PASS (one expected `[class*=]` hash-class warning) |
| skin-center route `…/crt-phosphor/stylesheet` | 200, `@font-face` present, local font URL intact |
| skin-center route `…/crt-phosphor/patches` | 200 |
| live GUI | `data-dsh-skin=crt-phosphor`, `document.fonts.check("12px \"Fusion Pixel 12px\"") === true` |
| live layers | `#root::before` animation `crt-breathe`, `#root::after` `crt-flicker`, no CSS scanline gradient |

## Known trade-offs

- The face is designed on a 12px grid; at the shell's odd sizes (11, 13, 14, 16)
  Chromium interpolates a little, so a few labels are softer than a native
  bitmap cell would be. Forcing every size token onto the 12px grid is possible
  and makes it razor sharp, at the cost of departing from the shell's type scale.
- `patches.css` matches a handful of CSS-module hash class names (`*_frame`,
  `*_sidebarCol`); `dsh-skin validate` warns about them because an official
  rebuild could rename them.
- With the details pane open, the right portrait stands over the pane. That is
  deliberate: the alternative is hiding her.
- The portraits are the same matted artwork the Lucy skin uses, so this skin
  inherits that character; `--crt-portrait-filter` switches her between natural
  colour and a full phosphor-ghost duotone in one line.

## Licence and attribution

CC BY-NC-SA 4.0 — attribution required, non-commercial, share-alike. The bundled
typeface is OFL-1.1 and keeps its own licence. The depicted character and setting
belong to their rights holders; this is unofficial fan artwork, unaffiliated with
CD Projekt Red or Studio Trigger. See [NOTICE](NOTICE) and [LICENSE](LICENSE).
