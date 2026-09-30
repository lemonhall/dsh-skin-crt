/**
 * Phosphor CRT hooks — the girls answer a real click on themselves.
 *
 * Why this file exists: a pseudo-element can never be the target of a pointer
 * event in Chromium (`body::before:hover` is not even a valid selector), so the
 * declare-only skin could only react to the input box. Here a document-level
 * pointer listener hit-tests the two portrait boxes — computed from the same
 * constants the stylesheet uses — and pops a bubble above whichever girl was hit.
 *
 * The bubble is plain DOM, not an asset: auto-sized to its text, styled with the
 * skin's own tokens, so a line can be any length and the plate never covers her
 * head (it is positioned above the artwork box, not inside it).
 *
 * Contract: x-org.linxin666.skin-center/v1alpha1 (facets.client). Loading this
 * module executes nothing; apply() owns every DOM write and retracts all of it
 * through ctx.onCleanup.
 */

/** Lines per girl, picked at random (never the same one twice in a row). */
const LINES = {
  left: ['你好呀，柠檬叔', '夜班中，信号良好', '要不要来杯合成咖啡？', '别盯太久，会被追踪的'],
  right: ['夜城信号良好', '我在呢，有事说', '这条线路是干净的', '再点我就拔网线了'],
}

/** Artwork geometry, mirrored from patches.css. */
const GEOMETRY = {
  left: { aspect: 609 / 1800, height: [340, 0.62, 780] },
  right: { aspect: 915 / 1800, height: [460, 0.76, 1040] },
}
const BOTTOM = [-30, -0.02, -10]
const VISIBLE_MS = 3600
const TYPE_MS = 55

const clamp = (min, value, max) => Math.min(max, Math.max(min, value))

/** Where a portrait actually sits, in viewport coordinates. */
function portraitRect(side) {
  const card = document.querySelector('[data-composer-card]')
  if (!card) return null
  const cardBox = card.getBoundingClientRect()
  const g = GEOMETRY[side]
  const height = clamp(g.height[0], window.innerHeight * g.height[1], g.height[2])
  const width = height * g.aspect
  const bottom = clamp(BOTTOM[0], window.innerHeight * BOTTOM[1], BOTTOM[2])
  const top = window.innerHeight - bottom - height
  return {
    left: side === 'left' ? cardBox.left - width : cardBox.right,
    right: side === 'left' ? cardBox.left : cardBox.right + width,
    top,
    bottom: top + height,
    width,
    height,
  }
}

/** The bubble styling, scoped to this skin's activation identity. */
function bubbleCss(scope) {
  const root = `html[data-dsh-skin="${scope}"]`
  return `
${root} .crt-bubble {
  position: fixed;
  z-index: 902;
  max-width: 320px;
  padding: 10px 14px 11px;
  border: 2px solid #7dffc0;
  border-radius: 14px;
  background: rgba(4, 22, 14, 0.96);
  box-shadow: 0 0 22px rgba(61, 255, 158, 0.35), 0 0 0 1px rgba(61, 255, 158, 0.25) inset;
  color: #d6ffe9;
  font-family: var(--dsw-font-family, monospace);
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: 0.02em;
  text-shadow: 0 0 1px rgba(61, 255, 158, 0.35), 0 0 6px rgba(61, 255, 158, 0.15);
  pointer-events: none;
  opacity: 0;
  transform: translateY(6px) scale(0.96);
  transition: opacity 0.14s ease-out, transform 0.14s ease-out;
}
${root} .crt-bubble[data-shown="true"] {
  opacity: 1;
  transform: translateY(0) scale(1);
}
/* the tail is a rotated square so it works at any bubble width */
${root} .crt-bubble::after {
  content: "";
  position: absolute;
  left: var(--crt-tail-x, 50%);
  bottom: -7px;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  background: rgba(4, 22, 14, 0.96);
  border-right: 2px solid #7dffc0;
  border-bottom: 2px solid #7dffc0;
  transform: rotate(45deg);
}
@media (prefers-reduced-motion: reduce) {
  ${root} .crt-bubble { transition: none; }
}
`
}

export default function defineSkinHooks() {
  return {
    apply(ctx) {
      if (typeof document === 'undefined' || !document.body) return

      const style = document.createElement('style')
      style.dataset.crtBubbles = '1'
      style.textContent = bubbleCss(ctx.scopeAttr)
      document.head.append(style)

      const bubbles = {}
      for (const side of ['left', 'right']) {
        const el = document.createElement('div')
        el.className = 'crt-bubble'
        el.dataset.side = side
        el.setAttribute('role', 'status')
        el.setAttribute('aria-live', 'polite')
        document.body.append(el)
        bubbles[side] = { el, line: '', last: '' }
      }

      let hideTimer = 0
      let typeTimer = 0

      const hide = (side) => {
        const bubble = bubbles[side]
        bubble.el.dataset.shown = 'false'
      }

      const hideAll = () => {
        for (const side of Object.keys(bubbles)) hide(side)
      }

      const show = (side, rect, pointX) => {
        const bubble = bubbles[side]
        const pool = LINES[side]
        let line = pool[(Math.random() * pool.length) | 0]
        if (line === bubble.last) line = pool[(pool.indexOf(line) + 1) % pool.length]
        bubble.last = line

        // above the head, never over it
        bubble.el.style.bottom = `${Math.round(window.innerHeight - rect.top + 10)}px`
        const center = rect.left + rect.width / 2
        const halfWidth = bubble.el.offsetWidth / 2 || 90
        bubble.el.style.left = `${Math.round(clamp(halfWidth + 8, center, window.innerWidth - halfWidth - 8))}px`
        bubble.el.style.transform = 'translateX(-50%)'
        bubble.el.style.setProperty(
          '--crt-tail-x',
          `${Math.round(clamp(18, pointX - (center - halfWidth), bubble.el.offsetWidth - 18))}px`,
        )

        // typewriter reveal, so it reads like a terminal printing a line
        bubble.el.dataset.shown = 'true'
        bubble.el.textContent = ''
        let index = 0
        window.clearInterval(typeTimer)
        typeTimer = window.setInterval(() => {
          index += 1
          bubble.el.textContent = line.slice(0, index)
          if (index >= line.length) window.clearInterval(typeTimer)
        }, TYPE_MS)
        bubble.el.textContent = ''

        window.clearTimeout(hideTimer)
        hideTimer = window.setTimeout(() => hide(side), VISIBLE_MS)
      }

      const onPointerDown = (event) => {
        // dsh-lucy-companion owns her bubble when it is loaded: it narrates the
        // whale-widget numbers instead of a fixed greeting, so stay quiet here.
        if (document.documentElement.dataset.lucyNarrator === '1') return
        const x = event.clientX
        const y = event.clientY
        for (const side of ['left', 'right']) {
          const rect = portraitRect(side)
          if (!rect) continue
          // the head and torso band, inset a little from the artwork margins
          const hitX = x >= rect.left - 6 && x <= rect.right + 6
          const hitY = y >= rect.top - 6 && y <= rect.top + rect.height * 0.72
          if (hitX && hitY) {
            hideAll()
            show(side, rect, x)
            return
          }
        }
        hideAll()
      }

      const onResize = () => hideAll()

      document.addEventListener('pointerdown', onPointerDown, true)
      window.addEventListener('resize', onResize)

      ctx.onCleanup(() => {
        document.removeEventListener('pointerdown', onPointerDown, true)
        window.removeEventListener('resize', onResize)
        window.clearTimeout(hideTimer)
        window.clearInterval(typeTimer)
        for (const side of Object.keys(bubbles)) bubbles[side].el.remove()
        style.remove()
      })
    },
  }
}
