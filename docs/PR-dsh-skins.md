# Submitting this skin to the Workshopp repository

Target: `zhu1090093659/dsh-skins` (the content satellite the Workshop reads).
Content PRs are rejected by the market repo, so the skin directory must land here.

## What lands where

```
skins/crt-phosphor/            the whole skin directory, nothing else
  skin.json  skin.css  patches.css
  assets/    scenes, portraits, the bundled pixel font + its licences
  preview/   light.jpg  dark.jpg   (1440x900 JPEG q85, facade-rendered)
  README.md  README.zh.md
```

No `package.json`, no build step: the skin center is the only loader.

## Gates, all run on the submission tree

| gate | result |
| --- | --- |
| `node scripts/dsh-skin.cjs validate skins/crt-phosphor` | PASS (one expected `[class*=]` hash-class warning) |
| `node scripts/skin-hooks-registry.mjs --check` | OK (no hooks facet, no registry drift) |
| `pnpm skin-center:check` | OK |
| `pnpm typecheck` | OK |
| `pnpm test` | OK |
| `pnpm build` | OK |
| `git diff --exit-code -- lib` | clean |

## Two things a reviewer should know

1. **A font ships inside the skin.** `assets/fusion-pixel-12px-monospaced.woff2` is
   Fusion Pixel Font (OFL-1.1). It is loaded with a local relative `@font-face`,
   which is the only kind that survives the CSS safety pipeline. The font's own
   licence text is bundled at `assets/FUSION-PIXEL-OFL.txt`, plus the licences of
   the upstream faces it composes in `assets/licenses/`. A Latin-only DOS bitmap
   font (IBM VGA 8x16, CP437) was rejected deliberately: this GUI is mostly
   Chinese and those fonts have no hanzi, so every Chinese glyph would fall back
   to a modern face.
2. **No `hooks.mjs`, on purpose.** The market preview renderer never executes skin
   hooks, so everything here is declarative CSS: tokens plus three free-selector
   layers. A page screenshot and the facade preview therefore show the same thing.

## PR

Title: `feat(skins): add crt-phosphor`

Body:

```markdown
## What

Adds the `crt-phosphor` skin: the dsh web GUI as an old phosphor tube - green
monospace on smoked glass, scanlines and a vignette baked into the artwork (drawn
scanlines beat against the device pixel ratio and read as thick bands), a faint
phosphor bloom, and two portraits anchored to the input card's edges.

## Why it is built this way

- Scene: a character-free night city mapped through a P1 phosphor ramp with
  halation, baked scanlines, vignette and grain (tools/build_crt_assets.py).
- Type: all 31 official `--dsw-font-*-font-family` tokens point at a bundled
  OFL-1.1 dot-matrix face covering Latin **and** Simplified Chinese. The classic
  DOS bitmap fonts cover CP437 only, which would leave every hanzi to a modern
  fallback and break the look where it matters most.
- Tube: `#root::before` vignette + slow breathing, `#root::after` bloom + a rare
  shallow flicker, text bloom with a whisker of chromatic fringe. No moving
  scanline band: it read as mechanical at 1.5 DPR.
- Portraits: `body::before` / `body::after` use `anchor(--crt-composer left|right)`
  against `[data-composer-card]`, so they follow both drawers without measuring
  anything, at `z-index: 900` (above the shell's 15-40, below the whale widget's
  9999).

## Verification

- `dsh-skin validate`: PASS; `skin-hooks-registry --check`, `skin-center:check`,
  `typecheck`, `test`, `build`: all OK; `git diff -- lib`: clean.
- Live GUI: `data-dsh-skin=crt-phosphor`,
  `document.fonts.check("12px \"Fusion Pixel 12px\"") === true`, both skin-center
  routes 200 with `@font-face` intact.

## Disclosure

Artwork is AI-generated and locally processed; the full provenance is in the
project repository's `NOTICE`, and the bundled typeface keeps its own OFL-1.1
licence. Unofficial fan artwork, not affiliated with the rights holders.
```

## Local repo of this skin

`E:\development\dsh-skin-crt` (branch `main`) carries the sources, the technique
write-up in `docs/CRT-TECHNIQUE.md`, and the tools used for the assets and the
previews. The submission branch here is `feat/skins-crt-phosphor`, cut from
`upstream/main`.
