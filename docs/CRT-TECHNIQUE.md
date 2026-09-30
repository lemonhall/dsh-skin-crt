# How the phosphor tube is built

Notes from building `crt-phosphor`, including the two things that only showed up
once the skin was running on a real display and read back through CDP. Measured
on DSH desktop 0.2.0-rc.2, Chromium 152, window 1707x912 CSS px at a device pixel
ratio of 1.5.

## Layer plan

| layer | owner | job |
| --- | --- | --- |
| artwork | `assets/scene-*.webp` | the lit phosphor: duotone ramp, halation, baked scanlines, vignette, grain |
| `#root::before` | `patches.css` | glass: vignette plus a 7.5s breathing luminance (`crt-breathe`) |
| `#root::after` | `patches.css` | bloom: a faint screen-wide wash plus a rare shallow flicker (`crt-flicker`, 9s) |
| `body::before` / `body::after` | `patches.css` | the two portraits, anchored to the input card |
| tokens | `skin.css` | palette for every label/border/surface, and all 31 font-family tokens |

`#root` is made `position: relative` by the skin, which is what lets its
pseudo-elements cover the window. The portraits live on `body` instead, because a
pseudo-element of `#root` would be clipped by the frame's painting order and could
not use `position: fixed`.

## Lesson 1: never draw scanlines in CSS over a scaled UI

The first version put the scanlines in `patches.css`:

```css
/* rejected */
repeating-linear-gradient(180deg, #00000038 0 1px, #00000000 1px 3px)
```

At a device pixel ratio of 1.5 a 3px CSS period does not land on the pixel grid:
the pattern beats against it and the eye reads **a few thick bands** rather than
fine lines. A slow `background-position` animation (the "roll" band, a CRT
authenticity trick) made it worse by drawing attention to the artefact.

Fix: bake the scanlines into the artwork (they then scale with the image and
never beat against the raster), keep only a **vignette** plus very low frequency
motion in CSS. Verified afterwards in the live page:

```powershell
& $node $bin --cdp 9222 eval 'JSON.stringify({before:getComputedStyle(document.getElementById("root"),"::before").backgroundImage.includes("repeating")})'
# -> false
```

If you do want animated scanlines, use a period that is a whole number of device
pixels (`2px` at DPR 1, `3px` at DPR 1.5 is fine only if the gradient stops land
on pixel boundaries) and keep the alpha under ~0.1, or animate `opacity` of a
static pattern instead of moving it.

## Lesson 2: a DOS bitmap font does not solve Chinese

The obvious move - IBM VGA 8x16 from the Ultimate Oldschool PC Font Pack - covers
CP437 (Latin plus box drawing) only. This GUI is mostly Chinese, so every hanzi
would fall back to a modern face and the dot-matrix illusion would break exactly
where it is most visible. The DOS-era Chinese answer was a 16x16 dot-matrix font
(HZK16 and friends), a raw bitmap dump with no webfont form.

Pick instead: **Fusion Pixel 12px monospaced** (OFL-1.1), one pixel grid for Latin
and Simplified Chinese, shipped as woff2 in `assets/`.

Pipeline facts, both verified against the running skin center:

- `@font-face` survives the CSS safety pipeline when the URL is local and
  relative: `GET /api/skin-center/v2/skins/crt-phosphor/stylesheet` returns 200
  and still contains the `@font-face` block with `url("assets/…woff2")` intact.
  Remote and protocol URLs are rejected, so a CDN font is not an option and the
  face has to travel inside the skin.
- At-rules without selectors are not scoped (the same reason `@keyframes` works):
  `@font-face` cannot be prefixed with `html[data-dsh-skin=...]`, and does not
  need to be.

`document.fonts.check()` is the cheapest end-to-end proof that the face really is
usable at a given size:

```powershell
& $node $bin --cdp 9222 eval 'document.fonts.check("12px \"Fusion Pixel 12px\"")'   # true
```

## Lesson 3: switching skins from outside needs a reload

`POST /api/skin-center/v2/active` persists the selection but does **not** hot-swap
the running page: after the call, `document.documentElement.dataset.dshSkin` and
the injected stylesheets still belong to the previous skin (and its
`body::before` portraits keep painting). Reload the page, or switch inside the
Skin Center card, which performs the swap client-side.

## Lesson 4: keep the portrait layering ladder

Shell surfaces occupy z-index 15-40, the whale widget root is `position: fixed;
z-index: 9999` on `<body>`, and the portraits sit at **900**. An earlier attempt at
`9999` painted the portraits over the desktop pet's bubble; at an equal z-index the
tie goes to tree order and a pseudo-element is the last child box. Below 900 the
portraits disappear behind the panels instead. 900 is the band that works.

## Rebuilding the assets

```powershell
uv run python tools/build_crt_assets.py      # needs the sibling Lucy project's scenes
uv run python tools/wire_pixel_font.py       # only when re-vendoring the font
python tools/inject_skin_into_facade.py <skin-dir> <id> <facade-dir>
node tools/capture_facade.cjs <facade-dir> <out-dir> <id>
```

`inject_skin_into_facade.py` is skin-agnostic: it copies any skin directory into
`<facade>/assets/skins/<id>/` and patches `window.SKIN_MANIFEST` /
`window.SKIN_STYLES`, which is what the market build does for published skins.
That is how the 1440x900 previews in `skins/crt-phosphor/preview/` were made.
