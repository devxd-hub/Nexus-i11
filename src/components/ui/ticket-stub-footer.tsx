"use client"

import * as React from "react"
import { gsap, ScrollTrigger } from "../../lib/smoothScroll"

/**
 * Ticket Stub Footer — a dark, hairline-ruled closing section for an ops
 * product, with the brand printed on an orange ticket.
 *
 * Top: a numbered section index, a hero (typewriter eyebrow, light grotesk
 * headline, chamfered CTA), a slowly turning globe of meridians with orange
 * tickets flying over it, and two link columns. Below: an orange ticket with a
 * punchable stub, a live agent status, a rolling "tickets solved" odometer, a
 * mono blurb that decodes itself in, and a full-width serif wordmark whose
 * foot dissolves into a halftone. Point at the wordmark and it breaks into
 * dots under the pointer; click and a ripple runs through it.
 *
 * No dependencies and nothing fetched: React is the only import, the globe is
 * SVG built from numbers, the wordmark is canvas drawn from system fonts.
 */

// #region stub
// Pure: formatting, timing, halftone and globe maths. Lifted out and run by the test.

export const clamp01 = (v: number): number => (v > 0 ? (v > 1 ? 1 : v) : 0)

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** 12745012 → "12,745,012". Negative, fractional or non-finite input never prints garbage. */
export const formatCount = (n: number, sep: string = ","): string => {
  const v = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, sep)
}

/** A clip-path polygon with the four corners cut: top-left, top-right, bottom-right, bottom-left, in px. */
export const chamfer = (tl: number, tr: number, br: number, bl: number): string =>
  "polygon(" +
  [
    tl + "px 0",
    "calc(100% - " + tr + "px) 0",
    "100% " + tr + "px",
    "100% calc(100% - " + br + "px)",
    "calc(100% - " + br + "px) 100%",
    bl + "px 100%",
    "0 calc(100% - " + bl + "px)",
    "0 " + tl + "px",
  ].join(", ") +
  ")"

export type TypeTiming = { type: number; hold: number; erase: number; gap: number }
export const TYPE: TypeTiming = { type: 55, hold: 2600, erase: 22, gap: 420 }

/** Where a looping typewriter is after `ms`: type a phrase, hold it, erase it, pause, next. */
export const typeFrame = (
  phrases: string[],
  ms: number,
  k: TypeTiming = TYPE,
): { index: number; text: string; phase: "type" | "hold" | "erase" | "gap" } => {
  const list = phrases.filter((p) => p.length > 0)
  if (!list.length) return { index: 0, text: "", phase: "gap" }
  const spans = list.map((p) => p.length * k.type + k.hold + p.length * k.erase + k.gap)
  const total = spans.reduce((a, b) => a + b, 0)
  let t = Number.isFinite(ms) && total > 0 ? ((ms % total) + total) % total : 0
  let i = 0
  while (i < list.length - 1 && t >= spans[i]) t -= spans[i++]
  const p = list[i]
  const typing = p.length * k.type
  if (t < typing) return { index: i, text: p.slice(0, Math.floor(t / k.type) + 1), phase: "type" }
  t -= typing
  if (t < k.hold) return { index: i, text: p, phase: "hold" }
  t -= k.hold
  const erasing = p.length * k.erase
  if (t < erasing) return { index: i, text: p.slice(0, p.length - Math.floor(t / k.erase)), phase: "erase" }
  return { index: i, text: "", phase: "gap" }
}

/** A small integer hash → [0, 1). Deterministic, so a scramble frame is reproducible. */
export const hash = (n: number): number => {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

export const NOISE = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=/<>"

/**
 * The blurb decoding itself: at `p` = 0 every letter is noise, at 1 it is the
 * text. Letters settle left to right. Length and whitespace never change, so
 * justified text doesn't reflow while it decodes.
 */
export const scramble = (text: string, p: number, tick: number): string => {
  if (!(p < 1)) return text
  const n = text.length
  let out = ""
  for (let i = 0; i < n; i++) {
    const ch = text[i]
    if (/\s/.test(ch) || p * 1.3 - 0.3 > i / n) out += ch
    else out += NOISE[Math.floor(hash(i * 131 + tick * 7919) * NOISE.length)]
  }
  return out
}

export type Ring = { x: number; y: number; r: number; a: number }
export type Tone = {
  /** Where the halftone starts, as a fraction of the wordmark's height. */
  fade: number
  /** How much ink is left at the very bottom: 1 dissolves it completely. */
  depth: number
  /** The pointer lens: centre, radius (px) and strength 0 → 1. */
  lensX: number
  lensY: number
  lensR: number
  lens: number
  /** Print-in sweep, 0 → 1, left to right. */
  reveal: number
  /** Idle shimmer amplitude in the halftone band. */
  wave: number
  time: number
  rings: Ring[]
  ringW: number
}

/** How much ink a halftone cell at (x, y) keeps, 0 → 1. */
export const coverage = (x: number, y: number, w: number, h: number, s: Tone): number => {
  const ny = y / h
  let c = 1 - smoothstep(s.fade, 1.04, ny) * s.depth
  if (s.wave) c += s.wave * Math.sin((x / w) * 11 + s.time * 1.3 + ny * 4) * smoothstep(s.fade - 0.1, 1, ny)
  if (s.lens > 0) {
    const dx = x - s.lensX
    const dy = y - s.lensY
    c *= 1 - s.lens * Math.exp(-(dx * dx + dy * dy) / (s.lensR * s.lensR))
  }
  for (const g of s.rings) {
    const d = Math.hypot(x - g.x, y - g.y) - g.r
    c *= 1 - g.a * Math.exp(-(d * d) / (s.ringW * s.ringW))
  }
  c *= clamp01(s.reveal * 1.6 - (x / w) * 0.6)
  return clamp01(c)
}

/**
 * Dot radius for a coverage. Cells sit on staggered rows (every other row
 * shifted half a cell), whose covering radius is 0.625 of a cell — so a full
 * cell at 0.66 closes every gap and the letter reads solid.
 */
export const dotRadius = (c: number, cell: number): number => cell * 0.66 * Math.sqrt(clamp01(c))

/**
 * A point on the unit sphere: `theta` runs round the great circle through the
 * poles at longitude `lon`, then the globe is tipped (`tilt`, about x) and
 * leant (`roll`, about the view axis). z > 0 faces the viewer.
 */
export const project = (theta: number, lon: number, tilt: number, roll: number): [number, number, number] => {
  const x0 = Math.cos(theta) * Math.sin(lon)
  const y0 = Math.sin(theta)
  const z0 = Math.cos(theta) * Math.cos(lon)
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  const y1 = y0 * ct - z0 * st
  const z1 = y0 * st + z0 * ct
  const cr = Math.cos(roll)
  const sr = Math.sin(roll)
  return [x0 * cr - y1 * sr, x0 * sr + y1 * cr, z1]
}

/** The visible (front) half of one meridian as SVG path data, in screen space. */
export const meridianPath = (
  lon: number,
  tilt: number,
  roll: number,
  cx: number,
  cy: number,
  r: number,
  steps: number = 96,
): string => {
  let d = ""
  let pen = false
  for (let i = 0; i <= steps; i++) {
    const [x, y, z] = project((i / steps) * Math.PI * 2, lon, tilt, roll)
    if (z < 0) {
      pen = false
      continue
    }
    d += (pen ? "L" : "M") + (cx + r * x).toFixed(1) + " " + (cy - r * y).toFixed(1)
    pen = true
  }
  return d
}

/** The tallest a wordmark's ascenders may stand, as a fraction of its width. */
export const MAX_CAP = 0.2

/**
 * Font size and extra tracking (px) so a word fills the width `w`. Scaled to
 * the width, unless that would stand it taller than `maxH`: then it is capped
 * and the leftover is spread between the letters. `ink100` and `asc100` are
 * the word's ink width and ascent measured at 100px.
 */
export const fitWord = (
  ink100: number,
  asc100: number,
  w: number,
  maxH: number,
  letters: number,
): { size: number; extra: number } => {
  if (!(ink100 > 0) || !(w > 0)) return { size: 0, extra: 0 }
  let size = (100 * w) / ink100
  let extra = 0
  if (asc100 > 0 && maxH > 0 && (asc100 * size) / 100 > maxH) {
    size = (100 * maxH) / asc100
    if (letters > 1) extra = (w - (ink100 * size) / 100) / (letters - 1)
  }
  return { size, extra }
}

/** Next counter step: how long to wait and how many tickets land, from a rate in tickets/second. */
export const nextTick = (rate: number, rand: () => number = Math.random): { delay: number; add: number } => {
  const delay = 450 + rand() * 900
  const mean = Number.isFinite(rate) && rate > 0 ? (rate * delay) / 1000 : 0
  return { delay, add: mean > 0 ? Math.max(1, Math.round(mean * (0.4 + rand() * 1.2))) : 0 }
}
// #endregion

export type StubLink = { label: string; href?: string }
export type StubLinkGroup = { title: string; links: StubLink[] }

export type TicketStubFooterProps = {
  /** Product name. Printed as the wordmark and in the footer. */
  brand?: string
  /** What the ticket prints, if not the brand. The first lowercase "i" gets a diamond for a dot. */
  wordmark?: string
  /** Footer copyright line, e.g. "Dispatch AI". */
  company?: string
  year?: string | number
  /** Numbered index down the left. Without an href an item is a button that just becomes active. */
  sections?: StubLink[]
  /** Initially active index row. */
  defaultSection?: number
  onSectionChange?: (index: number) => void
  /** Eyebrow phrases, typed out in turn. */
  eyebrow?: string[]
  /** Headline, one entry per line. */
  headline?: string[]
  description?: string
  cta?: StubLink
  onCtaClick?: () => void
  /** Link columns on the right. Two read best. */
  linkGroups?: StubLinkGroup[]
  /** Status toggle labels: [running, paused]. */
  statusLabels?: [string, string]
  statusCaption?: string
  defaultActive?: boolean
  onStatusChange?: (active: boolean) => void
  /** Starting value of the counter. */
  count?: number
  countLabel?: string
  showCount?: boolean
  /** Average tickets per second while running. 0 stops the counter. */
  rate?: number
  /** Mono paragraph on the ticket. */
  blurb?: string
  /** Footer links after the copyright. No href renders as plain text. */
  legal?: StubLink[]
  /** Fired when the stub is punched, with the new total. */
  onDispatch?: (total: number) => void
  /** Page colour behind everything. */
  background?: string
  /** Cream text and the CTA. */
  ink?: string
  /** Secondary text. */
  muted?: string
  /** The ticket. */
  accent?: string
  /** The stub, a shade darker than the ticket. */
  accentDeep?: string
  /** Text and wordmark on the ticket. */
  accentInk?: string
  /** Headlines, links and body. */
  fontSans?: string
  /** The wordmark. */
  fontSerif?: string
  /** Eyebrow and blurb. */
  fontMono?: string
  /** Wordmark weight. */
  serifWeight?: number
  /** Halftone foot on the wordmark, plus the pointer lens. false prints it solid. */
  halftone?: boolean
  className?: string
}

const DEFAULT_SECTIONS: StubLink[] = [
  { label: "Intro" },
  { label: "Capabilities" },
  { label: "Performance" },
  { label: "Features" },
  { label: "Integrations" },
  { label: "Pricing" },
  { label: "Testimonials" },
  { label: "Resources" },
]

const DEFAULT_LINKS: StubLinkGroup[] = [
  {
    title: "Pages",
    links: [{ label: "Homepage" }, { label: "Company" }, { label: "Updates" }, { label: "Waitlist" }, { label: "Blog" }, { label: "404" }],
  },
  {
    title: "Social",
    links: [{ label: "Telegram" }, { label: "Youtube" }, { label: "Linkedin" }, { label: "Discord" }, { label: "Github" }, { label: "X" }],
  },
]

const DEFAULT_EYEBROW = ["Ready to ship support ops", "Guardrails on, humans in the loop", "Routing tickets while you sleep"]

const SANS = '"Neue Montreal", "Inter Tight", Inter, "Helvetica Neue", Helvetica, Arial, sans-serif'
const SERIF =
  '"GT Super Display", Canela, Didot, "Bodoni 72", "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "Times New Roman", serif'
const MONO = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const CSS =
  ".tsf{position:relative;container-type:inline-size;background:var(--tsf-bg);color:var(--tsf-ink);font-family:var(--tsf-sans);overflow:clip;isolation:isolate;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}" +
  ".tsf *,.tsf *::before,.tsf *::after{box-sizing:border-box}" +
  ":where(.tsf) a{color:inherit;text-decoration:none}" +
  ":where(.tsf) button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit}" +
  ":where(.tsf) :focus-visible{outline:1px solid var(--tsf-accent);outline-offset:3px}" +
  ".tsf-grid{--rail:clamp(16px,2.5cqw,36px);--nav:clamp(116px,12.5cqw,180px);--line:color-mix(in srgb,var(--tsf-ink) 11%,transparent);--oline:color-mix(in srgb,var(--tsf-aink) 16%,transparent);--pad:clamp(12px,2.25cqw,30px);position:relative;display:grid;" +
  "grid-template-columns:var(--rail) var(--nav) var(--rail) minmax(0,1fr) var(--rail) minmax(0,1fr) var(--rail);" +
  "grid-template-rows:clamp(32px,5cqw,72px) auto var(--rail) auto clamp(14px,1.7cqw,24px) auto}" +
  ".tsf-vl{grid-row:1/-1;justify-self:start;width:0;border-left:1px solid var(--line);pointer-events:none}" +
  ".tsf-hl{grid-column:1/-1;align-self:start;height:0;border-top:1px solid var(--line);pointer-events:none}" +
  // index
  ".tsf-nav{grid-column:2;grid-row:2;position:relative}" +
  ".tsf-nav ol{list-style:none;margin:0;padding:0;position:relative}" +
  ".tsf-nav li{border-bottom:1px solid var(--line)}" +
  ".tsf-nav-item{position:relative;display:flex;align-items:center;gap:clamp(8px,1cqw,14px);width:100%;height:clamp(24px,2.4cqw,32px);padding:0 6px;font-size:clamp(10.5px,.95cqw,13px);letter-spacing:.01em;color:color-mix(in srgb,var(--tsf-ink) 88%,transparent);transition:color .25s,background-color .25s,padding .35s cubic-bezier(.2,.8,.2,1)}" +
  ".tsf-nav-item span:first-child{color:var(--tsf-muted);font-variant-numeric:tabular-nums;transition:color .25s}" +
  ".tsf-nav-item:hover{background:color-mix(in srgb,var(--tsf-ink) 4%,transparent);padding-left:12px}" +
  ".tsf-nav-item:hover span:first-child,.tsf-nav-item[aria-current] span:first-child{color:var(--tsf-accent)}" +
  ".tsf-nav-item[aria-current]{color:var(--tsf-ink);padding-left:12px}" +
  ".tsf-nav-bar{position:absolute;left:-1px;top:0;width:2px;height:clamp(24px,2.4cqw,32px);background:var(--tsf-accent);transform:translateY(calc(var(--i) * (100% + 1px)));transition:transform .45s cubic-bezier(.7,0,.2,1);pointer-events:none}" +
  // hero
  ".tsf-hero{grid-column:4;grid-row:2;display:flex;flex-direction:column;min-width:0;padding-bottom:clamp(20px,2.4cqw,30px)}" +
  ".tsf-hero>:not(.tsf-eyebrow){margin-left:var(--pad);margin-right:var(--pad)}" +
  ".tsf-eyebrow{display:flex;align-items:center;gap:12px;padding-left:6px;height:clamp(26px,2.5cqw,32px);border-bottom:1px solid color-mix(in srgb,var(--tsf-ink) 40%,transparent);font-family:var(--tsf-mono);font-size:clamp(11px,1.05cqw,13.5px);white-space:nowrap}" +
  ".tsf-eyebrow svg{flex:none;width:12px;height:12px;max-width:none}" +
  ".tsf-type{min-width:0;overflow:hidden;text-overflow:clip}" +
  ".tsf-caret{display:inline-block;width:.55em;height:1.05em;margin-left:2px;vertical-align:-.18em;background:var(--tsf-accent);animation:tsf-blink 1s steps(1) infinite}" +
  ".tsf-dots{flex:1;min-width:24px;height:10px;opacity:.6;background-image:radial-gradient(circle,var(--dot,var(--tsf-ink)) .85px,transparent 1.25px);background-size:6px 5px;background-position:0 0;" +
  "-webkit-mask-image:linear-gradient(90deg,#000 0,#000 35%,rgba(0,0,0,.25) 50%,#000 65%,#000 100%);mask-image:linear-gradient(90deg,#000 0,#000 35%,rgba(0,0,0,.25) 50%,#000 65%,#000 100%);-webkit-mask-size:200% 100%;mask-size:200% 100%;animation:tsf-march 3.6s linear infinite}" +
  ".tsf-h{margin:clamp(28px,4.6cqw,64px) 0 0;font-weight:300;font-size:clamp(30px,3.65cqw,56px);line-height:1.12;letter-spacing:-.035em;color:var(--tsf-ink)}" +
  ".tsf-h span{display:block;overflow:hidden;padding-bottom:.06em;margin-bottom:-.06em}" +
  ".tsf-h span span{display:block;transform:translateY(0);transition:transform .9s cubic-bezier(.2,.8,.2,1)}" +
  ".tsf[data-seen='0'] .tsf-h span span{transform:translateY(110%)}" +
  ".tsf-p{margin:clamp(16px,2.1cqw,28px) 0 0;max-width:31em;font-size:clamp(13px,1.2cqw,16px);line-height:1.6;color:var(--tsf-muted)}" +
  ".tsf-cta{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:clamp(28px,6.6cqw,92px);height:clamp(42px,4cqw,52px);max-width:440px;background:var(--tsf-ink);color:var(--tsf-bg);font-weight:600;font-size:clamp(12px,1.1cqw,14px);letter-spacing:.02em;text-transform:uppercase;overflow:hidden;transition:transform .2s}" +
  ".tsf-cta::before{content:'';position:absolute;inset:0;background:var(--tsf-accent);transform:scaleX(0);transform-origin:left;transition:transform .55s cubic-bezier(.7,0,.2,1)}" +
  ".tsf-cta:hover::before,.tsf-cta:focus-visible::before{transform:scaleX(1)}" +
  ".tsf-cta:active{transform:translateY(1px)}" +
  ".tsf-cta>span{position:relative}" +
  ".tsf-cta svg{position:relative;width:14px;height:14px;max-width:none;opacity:0;transform:translateX(-10px);transition:opacity .3s,transform .45s cubic-bezier(.2,.8,.2,1)}" +
  ".tsf-cta:hover svg,.tsf-cta:focus-visible svg{opacity:1;transform:none}" +
  // side
  ".tsf-side{grid-column:6;grid-row:2;display:flex;flex-direction:column;min-width:0}" +
  ".tsf-orbit{position:relative;height:clamp(92px,11.4cqw,160px);border-bottom:1px solid var(--line);cursor:grab;touch-action:pan-y;overflow:hidden}" +
  ".tsf-orbit:active{cursor:grabbing}" +
  ".tsf-orbit::before,.tsf-orbit::after{content:'';position:absolute;top:0;bottom:0;width:14%;background-image:radial-gradient(circle,color-mix(in srgb,var(--tsf-ink) 45%,transparent) .7px,transparent 1.1px);background-size:4px 4px;pointer-events:none}" +
  ".tsf-orbit::before{left:0;-webkit-mask-image:linear-gradient(90deg,#000,transparent);mask-image:linear-gradient(90deg,#000,transparent)}" +
  ".tsf-orbit::after{right:0;-webkit-mask-image:linear-gradient(270deg,#000,transparent);mask-image:linear-gradient(270deg,#000,transparent)}" +
  ".tsf-orbit svg{position:absolute;left:0;top:0;width:100%;height:100%;max-width:none;display:block}" +
  ".tsf-links{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:24px;padding:clamp(22px,2.6cqw,36px) clamp(12px,2.3cqw,32px) clamp(20px,2.4cqw,30px)}" +
  ".tsf-links h3{margin:0 0 clamp(14px,1.8cqw,24px);font-weight:400;font-size:clamp(20px,2.2cqw,30px);letter-spacing:-.03em;color:var(--tsf-ink)}" +
  ".tsf-links ul{list-style:none;margin:0;padding:0;display:grid;gap:clamp(4px,.55cqw,8px)}" +
  ".tsf-link{position:relative;display:inline-flex;align-items:center;font-size:clamp(13px,1.2cqw,16px);line-height:1.45;color:var(--tsf-muted);transition:color .25s,transform .35s cubic-bezier(.2,.8,.2,1)}" +
  ".tsf-link::before{content:'';position:absolute;left:-12px;top:50%;width:5px;height:5px;margin-top:-2.5px;background:var(--tsf-accent);transform:rotate(45deg) scale(0);transition:transform .3s cubic-bezier(.2,.8,.2,1)}" +
  ".tsf-link::after{content:'';position:absolute;left:0;right:0;bottom:-2px;height:1px;background:currentColor;transform:scaleX(0);transform-origin:right;transition:transform .4s cubic-bezier(.7,0,.2,1)}" +
  ".tsf-link:hover,.tsf-link:focus-visible{color:var(--tsf-ink);transform:translateX(12px)}" +
  ".tsf-link:hover::before,.tsf-link:focus-visible::before{transform:rotate(45deg) scale(1)}" +
  ".tsf-link:hover::after,.tsf-link:focus-visible::after{transform:scaleX(1);transform-origin:left}" +
  // ticket
  ".tsf-ticket{grid-column:2/7;grid-row:4;position:relative;z-index:1;display:grid;grid-template-columns:var(--nav) minmax(0,1fr);color:var(--tsf-aink);will-change:transform,opacity,clip-path;transform-origin:center top}" +
  ".tsf-stub{position:relative;display:flex;align-items:center;justify-content:center;background-color:var(--tsf-deep);" +
  "background-image:repeating-linear-gradient(135deg,color-mix(in srgb,var(--tsf-aink) 7%,transparent) 0 1px,transparent 1px 5px);transition:transform .35s cubic-bezier(.2,.8,.2,1),filter .3s;transform-origin:100% 100%}" +
  ".tsf-stub::after{content:'';position:absolute;right:0;top:14px;bottom:14px;width:1px;background-image:linear-gradient(to bottom,color-mix(in srgb,var(--tsf-aink) 45%,transparent) 50%,transparent 50%);background-size:1px 7px}" +
  ".tsf-stub:hover{transform:rotate(-1.4deg) translateY(-2px);filter:brightness(1.06)}" +
  ".tsf-stub:active{transform:rotate(-3deg) translateY(3px)}" +
  ".tsf-stub svg{width:clamp(30px,4.2cqw,54px);height:clamp(30px,4.2cqw,54px);max-width:none;transition:transform .7s cubic-bezier(.3,1.5,.4,1)}" +
  ".tsf-stub-tip{position:absolute;left:0;right:0;bottom:12px;text-align:center;font-family:var(--tsf-mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s}" +
  ".tsf-stub:hover .tsf-stub-tip,.tsf-stub:focus-visible .tsf-stub-tip{opacity:.7;transform:none}" +
  ".tsf-main{position:relative;display:grid;grid-template-columns:var(--rail) minmax(0,1fr) var(--rail) minmax(0,1fr);background:var(--tsf-accent);min-width:0}" +
  ".tsf-stats{grid-column:2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;padding:clamp(18px,2.4cqw,32px) 0 clamp(18px,2.3cqw,30px) clamp(12px,2.3cqw,28px)}" +
  ".tsf-stat{display:flex;flex-direction:column;gap:4px;min-width:0}" +
  ".tsf-stat-v{display:flex;align-items:center;gap:10px;font-size:clamp(20px,2.2cqw,31px);line-height:1.1;letter-spacing:-.035em;font-variant-numeric:tabular-nums;white-space:nowrap}" +
  ".tsf-stat-c{font-size:clamp(11.5px,1.12cqw,14.5px);color:color-mix(in srgb,var(--tsf-aink) 62%,transparent)}" +
  ".tsf-status{display:flex;flex-direction:column;gap:4px;border-radius:2px}" +
  ".tsf-pulse{position:relative;flex:none;width:7px;height:7px;background:var(--tsf-aink);transform:rotate(45deg)}" +
  ".tsf-pulse::after{content:'';position:absolute;inset:-3px;border:1px solid var(--tsf-aink);animation:tsf-ping 1.8s cubic-bezier(0,0,.2,1) infinite}" +
  ".tsf-status[aria-pressed='false'] .tsf-pulse{background:transparent;border:1px solid var(--tsf-aink)}" +
  ".tsf-status[aria-pressed='false'] .tsf-pulse::after{display:none}" +
  ".tsf-status:hover .tsf-stat-c{color:var(--tsf-aink)}" +
  ".tsf-status-hint{font-family:var(--tsf-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;opacity:0;transition:opacity .25s}" +
  ".tsf-status:hover .tsf-status-hint,.tsf-status:focus-visible .tsf-status-hint{opacity:.6}" +
  ".tsf-gutcell{grid-column:3;border-left:1px solid var(--oline);border-right:1px solid var(--oline)}" +
  ".tsf-blurb{grid-column:4;position:relative;margin:0;padding:clamp(18px,2.4cqw,32px) clamp(12px,2.3cqw,28px) clamp(18px,2.3cqw,30px);font-family:var(--tsf-mono);font-size:clamp(11px,1.06cqw,13.5px);line-height:1.48;text-align:justify;hyphens:none}" +
  ".tsf-word{grid-column:2/-1;position:relative;border-top:1px solid var(--oline);cursor:crosshair;touch-action:pan-y}" +
  ".tsf-word canvas{position:absolute;left:0;top:0;width:100%;height:100%;max-width:none;display:block}" +
  ".tsf-odo{display:inline-flex}" +
  ".tsf-odo-d{display:inline-block;height:1.1em;overflow:hidden}" +
  ".tsf-odo-s{display:flex;flex-direction:column;transition:transform .7s cubic-bezier(.2,.9,.25,1)}" +
  ".tsf-odo-s span{display:block;height:1.1em;line-height:1.1em}" +
  ".tsf-bump{animation:tsf-bump .5s cubic-bezier(.2,.8,.2,1)}" +
  // footer
  ".tsf-foot{grid-column:1/-1;grid-row:6;display:grid;grid-template-columns:var(--rail) var(--nav) var(--rail) minmax(0,1fr) var(--rail) minmax(0,1fr) var(--rail);align-items:center;min-height:clamp(52px,6cqw,76px);font-size:clamp(11px,1cqw,13px)}" +
  ".tsf-copy{grid-column:2/4;padding-left:0;color:color-mix(in srgb,var(--tsf-ink) 88%,transparent);white-space:nowrap}" +
  ".tsf-foot .tsf-dots{--dot:var(--tsf-muted)}" +
  ".tsf-foot-l{grid-column:4;display:flex;padding-right:45%}" +
  ".tsf-foot-r{grid-column:6;display:flex;align-items:center;gap:clamp(14px,2.6cqw,32px);white-space:nowrap}" +
  ".tsf-foot-r>span{color:var(--tsf-muted)}" +
  ".tsf-foot-r a{position:relative;color:color-mix(in srgb,var(--tsf-ink) 88%,transparent);transition:color .2s}" +
  ".tsf-foot-r a:hover{color:var(--tsf-accent)}" +
  ".tsf-top{grid-column:7;justify-self:center;width:14px;height:14px;display:grid;place-items:center;color:var(--tsf-accent);transition:transform .6s cubic-bezier(.3,1.5,.4,1)}" +
  ".tsf-top svg{width:14px;height:14px;max-width:none}" +
  ".tsf-top:hover{transform:rotate(-90deg) scale(1.25)}" +
  "@keyframes tsf-blink{50%{opacity:0}}" +
  "@keyframes tsf-march{from{-webkit-mask-position:0 0;mask-position:0 0}to{-webkit-mask-position:-200% 0;mask-position:-200% 0}}" +
  "@keyframes tsf-ping{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.9);opacity:0}}" +
  "@keyframes tsf-bump{0%{transform:translateY(0)}35%{transform:translateY(-3px)}100%{transform:translateY(0)}}" +
  // narrow: one column, index scrolls sideways, ticket stacks
  "@container (max-width: 860px){" +
  ".tsf-grid{grid-template-columns:var(--rail) minmax(0,1fr) var(--rail);grid-template-rows:none;row-gap:0;padding-top:20px}" +
  ".tsf-vl,.tsf-hl{display:none}" +
  ".tsf-nav,.tsf-hero,.tsf-side,.tsf-ticket{grid-column:2;grid-row:auto}" +
  ".tsf-nav{overflow-x:auto;scrollbar-width:none;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}" +
  ".tsf-nav ol{display:flex}" +
  ".tsf-nav li{border-bottom:0;border-right:1px solid var(--line);flex:none}" +
  ".tsf-nav-item{padding:0 12px;white-space:nowrap}" +
  ".tsf-nav-item:hover,.tsf-nav-item[aria-current]{padding-left:12px}" +
  ".tsf-nav-bar{display:none}" +
  ".tsf-nav-item[aria-current]{box-shadow:inset 0 -2px var(--tsf-accent)}" +
  ".tsf-hero{padding-top:28px;padding-bottom:36px}" +
  ".tsf-side{border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:24px}" +
  ".tsf-links{padding-left:14px}" +
  ".tsf-ticket{grid-template-columns:clamp(44px,12cqw,72px) minmax(0,1fr)}" +
  ".tsf-stub-tip{display:none}" +
  ".tsf-main{grid-template-columns:minmax(0,1fr)}" +
  ".tsf-stats,.tsf-blurb,.tsf-word{grid-column:1}" +
  ".tsf-stats{padding-left:16px;padding-right:16px}" +
  ".tsf-gutcell{display:none}" +
  ".tsf-blurb{border-top:1px solid var(--oline);padding-left:16px;padding-right:16px}" +
  ".tsf-foot{grid-column:1/-1;grid-row:auto;display:flex;flex-wrap:wrap;gap:12px 20px;padding:20px var(--rail)}" +
  ".tsf-foot-l{display:none}" +
  ".tsf-foot-r{flex:1;flex-wrap:wrap;gap:12px 20px}" +
  ".tsf-foot-r .tsf-dots{display:none}" +
  "}" +
  "@media (prefers-reduced-motion: reduce){" +
  ".tsf-dots,.tsf-caret,.tsf-pulse::after,.tsf-bump{animation:none}" +
  ".tsf-h span span,.tsf-odo-s,.tsf-stub,.tsf-stub svg,.tsf-cta::before,.tsf-nav-bar,.tsf-link,.tsf-top{transition:none}" +
  "}"

/** Diamond with a play cut-out: the brand mark on the stub and in the footer. */
function Mark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" className={className} style={style} aria-hidden="true" focusable="false">
      <path fillRule="evenodd" fill="currentColor" d="M24 1.5 46.5 24 24 46.5 1.5 24Z M19.5 15.5 32 24 19.5 32.5Z" />
    </svg>
  )
}

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof matchMedia === "undefined") return
    const mq = matchMedia("(prefers-reduced-motion: reduce)")
    const onMq = () => setReduced(mq.matches)
    onMq()
    mq.addEventListener("change", onMq)
    return () => mq.removeEventListener("change", onMq)
  }, [])
  return reduced
}

/** Rolling digits. Keys count from the right so a digit keeps its column as the number grows. */
function Odometer({ value }: { value: number }) {
  const s = formatCount(value)
  return (
    <span className="tsf-odo" aria-hidden="true">
      {s.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span className="tsf-odo-d" key={s.length - i}>
            <span className="tsf-odo-s" style={{ transform: "translateY(" + -Number(ch) * 10 + "%)" }}>
              {"0123456789".split("").map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={"s" + (s.length - i)}>{ch}</span>
        ),
      )}
    </span>
  )
}

function Eyebrow({ phrases, reduced, visible }: { phrases: string[]; reduced: boolean; visible: boolean }) {
  const [ms, setMs] = React.useState(0)
  const msRef = React.useRef(0)
  React.useEffect(() => {
    if (reduced || !visible) return
    const t0 = performance.now() - msRef.current
    const id = setInterval(() => {
      msRef.current = performance.now() - t0
      setMs(msRef.current)
    }, 40)
    return () => clearInterval(id)
  }, [reduced, visible])
  const text = reduced ? phrases[0] ?? "" : typeFrame(phrases, ms).text
  return (
    <div className="tsf-eyebrow">
      <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M6 1 11 6 6 11 1 6Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <span className="sr-only">{phrases[0]}</span>
      <span className="tsf-type" aria-hidden="true">
        {text}
        {!reduced && <span className="tsf-caret" />}
      </span>
      <span className="tsf-dots" aria-hidden="true" />
    </div>
  )
}

/** The blurb decodes itself the first time it is seen. */
function Blurb({ text, reduced, visible }: { text: string; reduced: boolean; visible: boolean }) {
  const [shown, setShown] = React.useState(text)
  const done = React.useRef(false)
  React.useEffect(() => {
    if (reduced || !visible || done.current) {
      setShown(text)
      return
    }
    done.current = true
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const p = (now - t0) / 1400
      setShown(scramble(text, p, Math.floor((now - t0) / 45)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [text, reduced, visible])
  return (
    <p className="tsf-blurb">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </p>
  )
}

type Packet = { k: number; theta: number; speed: number; life: number }

const MERIDIANS = 12
const TILT = 0.34
const ROLL = -1.36

/** A turning globe of meridians. Drag to spin it; punched tickets fly over it. */
function Orbit({ reduced, visible, pulse }: { reduced: boolean; visible: boolean; pulse: number }) {
  const boxRef = React.useRef<HTMLDivElement>(null)
  const svgRef = React.useRef<SVGSVGElement>(null)
  const paths = React.useRef<(SVGPathElement | null)[]>([])
  const dots = React.useRef<(SVGCircleElement | null)[]>([])
  const st = React.useRef({
    spin: 0.4,
    vel: 0.14,
    drag: false,
    lastX: 0,
    lastT: 0,
    w: 1,
    h: 1,
    packets: [{ k: 3, theta: -1.2, speed: 0.32, life: Infinity }] as Packet[],
    paint: () => {},
  })

  React.useEffect(() => {
    const s = st.current
    if (pulse > 0 && s.packets.length < 7) {
      s.packets.push({ k: Math.floor(Math.random() * MERIDIANS), theta: -1.6, speed: 0.9 + Math.random() * 0.5, life: 1 })
      s.paint()
    }
  }, [pulse])

  React.useEffect(() => {
    const svg = svgRef.current
    const s = st.current
    if (!svg) return
    const paint = () => {
      const { w, h } = s
      const cx = w * 0.56
      const cy = h * 1.5
      const r = Math.min(h * 1.42, w * 0.62)
      for (let k = 0; k < MERIDIANS; k++) {
        const el = paths.current[k]
        if (el) el.setAttribute("d", meridianPath(s.spin + (k * Math.PI) / MERIDIANS, TILT, ROLL, cx, cy, r))
      }
      for (let i = 0; i < 7; i++) {
        const el = dots.current[i]
        const p = s.packets[i]
        if (!el) continue
        if (!p) {
          el.setAttribute("opacity", "0")
          continue
        }
        const [x, y, z] = project(p.theta, s.spin + (p.k * Math.PI) / MERIDIANS, TILT, ROLL)
        const Y = cy - r * y
        el.setAttribute("cx", (cx + r * x).toFixed(1))
        el.setAttribute("cy", Y.toFixed(1))
        el.setAttribute("opacity", z > 0 && Y < h - 1 ? "1" : "0")
      }
    }
    s.paint = paint
    const measure = () => {
      s.w = svg.clientWidth || 1
      s.h = svg.clientHeight || 1
      svg.setAttribute("viewBox", "0 0 " + s.w + " " + s.h)
      paint()
    }
    const ro = new ResizeObserver(measure)
    ro.observe(svg)
    measure()
    if (reduced || !visible) return () => ro.disconnect()
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!s.drag) {
        s.vel += (0.14 - s.vel) * (1 - Math.exp(-dt * 1.6))
        s.spin += s.vel * dt
      }
      for (const p of s.packets) p.theta += p.speed * dt
      // the resident packet loops forever; punched ones fly once and leave
      s.packets = s.packets.filter((p) => p.life === Infinity || p.theta < Math.PI * 1.5)
      for (const p of s.packets) if (p.life === Infinity && p.theta > Math.PI * 1.5) p.theta -= Math.PI * 2
      paint()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [reduced, visible])

  const onDown = (e: React.PointerEvent) => {
    const s = st.current
    s.drag = true
    s.lastX = e.clientX
    s.lastT = performance.now()
    s.vel = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const s = st.current
    if (!s.drag) return
    const now = performance.now()
    const d = ((e.clientX - s.lastX) / s.w) * 2.4
    s.spin += d
    s.vel = d / Math.max(0.008, (now - s.lastT) / 1000)
    s.lastX = e.clientX
    s.lastT = now
    if (reduced || !visible) s.paint()
  }
  const onUp = () => {
    const s = st.current
    s.drag = false
    s.vel = Math.max(-6, Math.min(6, s.vel))
  }

  return (
    <div
      ref={boxRef}
      className="tsf-orbit"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-hidden="true"
    >
      <svg ref={svgRef} preserveAspectRatio="none" focusable="false">
        {Array.from({ length: MERIDIANS }, (_, k) => (
          <path
            key={k}
            ref={(el) => {
              paths.current[k] = el
            }}
            fill="none"
            stroke="var(--tsf-ink)"
            strokeOpacity={0.82}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <circle
            key={i}
            ref={(el) => {
              dots.current[i] = el
            }}
            r={i === 0 ? 2.6 : 3.2}
            fill="var(--tsf-accent)"
            opacity={0}
          />
        ))}
      </svg>
    </div>
  )
}

/**
 * The wordmark: set in the serif, fitted to the width, its foot dissolving
 * into a halftone. A canvas, so every dot is placed by hand: a full-ink mask
 * of dots is painted first, then the word is drawn `source-in` over it, so
 * letter edges stay crisp wherever the ink is solid.
 */
function Wordmark({
  word,
  fontSerif,
  weight,
  color,
  halftone,
  reduced,
  visible,
}: {
  word: string
  fontSerif: string
  weight: number
  color: string
  halftone: boolean
  reduced: boolean
  visible: boolean
}) {
  const boxRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [height, setHeight] = React.useState<number | null>(null)
  const st = React.useRef({
    lens: 0,
    lensTarget: 0,
    lx: 0,
    ly: 0,
    rings: [] as Ring[],
    reveal: 0,
    rot: 0,
    rotTarget: 0,
    time: 0,
    kick: () => {},
  })

  // Where the i's dot goes. The i itself is set dotless.
  const iAt = word.indexOf("i")
  const shown = iAt > -1 ? word.slice(0, iAt) + "\u0131" + word.slice(iAt + 1) : word

  React.useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    const ctx = canvas && canvas.getContext("2d")
    if (!box || !canvas || !ctx) return
    const s = st.current
    const g = { w: 1, h: 1, dpr: 1, font: "", size: 0, track: 0, x0: 0, base: 0, dx: 0, dy: 0, dr: 0, cell: 6 }

    const setFont = (px: number, track: number) => {
      ctx.font = weight + " " + px + "px " + fontSerif
      ctx.letterSpacing = track.toFixed(2) + "px"
    }

    const measure = () => {
      const w = box.clientWidth
      if (!w) return
      setFont(100, -3)
      const m100 = ctx.measureText(shown)
      const ink100 = m100.actualBoundingBoxLeft + m100.actualBoundingBoxRight || m100.width
      const fit = fitWord(ink100, m100.actualBoundingBoxAscent || 72, w * 0.995, w * MAX_CAP, shown.length)
      const size = fit.size || 1
      // Measure again at the real size: tracking isn't proportional once a short word is spread out.
      g.size = size
      g.track = -0.03 * size
      if (fit.extra) {
        setFont(size, g.track)
        const m0 = ctx.measureText(shown)
        const ink0 = m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight
        if (shown.length > 1 && ink0 > 0) g.track += (w * 0.995 - ink0) / (shown.length - 1)
      }
      setFont(size, g.track)
      g.font = ctx.font
      const m = ctx.measureText(shown)
      const asc = m.actualBoundingBoxAscent || size * 0.72
      g.x0 = m.actualBoundingBoxLeft
      g.dr = 0
      let top = asc
      if (iAt > -1) {
        const pre = ctx.measureText(shown.slice(0, iAt)).width
        const iw = ctx.measureText("\u0131").width - g.track
        const xh = ctx.measureText("x").actualBoundingBoxAscent || size * 0.5
        g.dr = size * 0.085
        g.dx = g.x0 + pre + iw / 2
        g.dy = xh + g.dr * 1.55 // above the baseline
        top = Math.max(top, g.dy + g.dr * 1.05)
      }
      const h = Math.ceil(top + size * 0.05)
      g.base = h + size * 0.01
      g.dy = g.base - g.dy
      g.w = w
      g.h = h
      g.dpr = Math.min(2, window.devicePixelRatio || 1)
      g.cell = Math.max(3.5, Math.min(9, w / 170))
      canvas.width = Math.round(w * g.dpr)
      canvas.height = Math.round(h * g.dpr)
      setHeight((prev) => (prev !== null && Math.abs(prev - h) < 0.5 ? prev : h))
      draw()
    }

    const draw = () => {
      const { w, h, dpr, cell } = g
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = "source-over"
      ctx.clearRect(0, 0, w, h)
      ctx.letterSpacing = g.track.toFixed(2) + "px"
      ctx.font = g.font
      ctx.textBaseline = "alphabetic"
      if (halftone) {
        const tone: Tone = {
          fade: 0.44,
          depth: 0.84,
          lensX: s.lx,
          lensY: s.ly,
          lensR: w * 0.09,
          lens: s.lens * 0.95,
          reveal: s.reveal,
          wave: reduced ? 0 : 0.06,
          time: s.time,
          rings: s.rings,
          ringW: w * 0.02,
        }
        ctx.beginPath()
        const half = cell / 2
        for (let j = 0, y = half; y < h + half; j++, y += cell) {
          const off = j % 2 ? half : 0
          for (let x = off; x < w + half; x += cell) {
            const c = coverage(x, y, w, h, tone)
            if (c < 0.01) continue
            if (c > 0.995) {
              ctx.rect(x - half - 0.3, y - half - 0.3, cell + 0.6, cell + 0.6)
              continue
            }
            const r = dotRadius(c, cell)
            ctx.moveTo(x + r, y)
            ctx.arc(x, y, r, 0, Math.PI * 2)
          }
        }
        ctx.fillStyle = "#000"
        ctx.fill()
        ctx.globalCompositeOperation = "source-in"
      }
      ctx.fillStyle = color
      ctx.fillText(shown, g.x0, g.base)
      ctx.globalCompositeOperation = "source-over"
      if (g.dr > 0) {
        const a = Math.min(1, s.reveal * 1.6 - (g.dx / w) * 0.6)
        if (a > 0) {
          ctx.save()
          ctx.globalAlpha = halftone ? clamp01(a) : 1
          ctx.translate(g.dx, g.dy)
          ctx.rotate(s.rot)
          ctx.beginPath()
          ctx.moveTo(0, -g.dr)
          ctx.lineTo(g.dr, 0)
          ctx.lineTo(0, g.dr)
          ctx.lineTo(-g.dr, 0)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
        }
      }
    }

    let raf = 0
    let last = 0
    const loop = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      last = now
      s.time += dt
      if (reduced || !halftone) {
        s.reveal = 1
        s.lens = s.lensTarget
        s.rot = s.rotTarget
        s.rings = []
      } else {
        s.reveal = Math.min(1, s.reveal + dt / 1.5)
        s.lens += (s.lensTarget - s.lens) * (1 - Math.exp(-dt * 7))
        s.rot += (s.rotTarget - s.rot) * (1 - Math.exp(-dt * 6))
        for (const r of s.rings) {
          r.r += g.w * 0.75 * dt
          r.a *= Math.exp(-dt * 1.4)
        }
        s.rings = s.rings.filter((r) => r.a > 0.02)
      }
      draw()
      const busy = !reduced && halftone && visible
      raf = busy ? requestAnimationFrame(loop) : 0
      if (!busy) last = 0
    }
    s.kick = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(measure)
    ro.observe(box)
    measure()
    let alive = true
    // A web font the installer passes may land after first paint.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && measure())
    if (visible || reduced || !halftone) s.kick()
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      raf = 0
      ro.disconnect()
    }
  }, [shown, iAt, fontSerif, weight, color, halftone, reduced, visible])

  const local = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const onMove = (e: React.PointerEvent) => {
    const s = st.current
    const [x, y] = local(e)
    s.lx = x
    s.ly = y
    s.lensTarget = halftone && e.pointerType !== "touch" ? 1 : 0
    s.kick()
  }
  const onLeave = () => {
    st.current.lensTarget = 0
    st.current.kick()
  }
  const onClick = (e: React.MouseEvent) => {
    const s = st.current
    const r = e.currentTarget.getBoundingClientRect()
    if (halftone && !reduced) s.rings.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 0, a: 0.9 })
    s.rotTarget += Math.PI / 2
    s.kick()
  }

  return (
    <div
      ref={boxRef}
      className="tsf-word"
      style={{ height: height === null ? undefined : height, aspectRatio: height === null ? "1000 / 240" : undefined }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} />
    </div>
  )
}

export default function TicketStubFooter({
  brand = "Dispatch",
  wordmark,
  company,
  year = 2026,
  sections = DEFAULT_SECTIONS,
  defaultSection = 0,
  onSectionChange,
  eyebrow = DEFAULT_EYEBROW,
  headline = ["Resolve tickets.", "Trigger actions."],
  description,
  cta = { label: "Get started" },
  onCtaClick,
  linkGroups = DEFAULT_LINKS,
  statusLabels = ["Active", "Paused"],
  statusCaption = "Agent Status",
  defaultActive = true,
  onStatusChange,
  count = 12745012,
  countLabel = "Tickets Solved",
  showCount = true,
  rate = 1.8,
  blurb,
  legal = [{ label: "All rights reserved" }, { label: "Terms of use", href: "#" }, { label: "Privacy Policy", href: "#" }],
  onDispatch,
  background = "#1b1a19",
  ink = "#e6dcc6",
  muted = "#8c867b",
  accent = "#ff6d36",
  accentDeep = "#d95a32",
  accentInk = "#1b1a19",
  fontSans = SANS,
  fontSerif = SERIF,
  fontMono = MONO,
  serifWeight = 500,
  halftone = true,
  className = "",
}: TicketStubFooterProps) {
  const rootRef = React.useRef<HTMLElement>(null)
  const ticketRef = React.useRef<HTMLDivElement>(null)
  const [ticketVisible, setTicketVisible] = React.useState(false)
  const reduced = useReducedMotion()
  const [visible, setVisible] = React.useState(false)
  const [seen, setSeen] = React.useState(false)
  const [section, setSection] = React.useState(defaultSection)
  const [active, setActive] = React.useState(defaultActive)
  const [total, setTotal] = React.useState(count)
  const [punch, setPunch] = React.useState(0)
  const [pulse, setPulse] = React.useState(0)
  const totalRef = React.useRef(count)
  totalRef.current = total

  const word = wordmark ?? brand
  const text =
    description ??
    "Connect your stack, set guardrails, and let " + brand + " handle repetitive work\u2014while your team stays in control."
  const blurbText =
    blurb ??
    "Connect your help center, knowledge base, and CRM software. " +
      brand +
      " resolves tickets, updates records, knowledge base, and CRM software."

  React.useEffect(() => {
    const el = ticketRef.current
    if (!el) return

    if (reduced) {
      setTicketVisible(true)
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        {
          y: 70,
          opacity: 0,
          scale: 0.94,
          clipPath: "inset(25% 0% 0% 0%)",
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.0,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none reverse",
            onEnter: () => setTicketVisible(true),
            onLeaveBack: () => setTicketVisible(false),
          },
        }
      )
    }, ticketRef)

    return () => ctx.revert()
  }, [reduced])

  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting)
        if (e.isIntersecting) setSeen(true)
      },
      { threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // The counter runs while the agent is active and the section is on screen.
  React.useEffect(() => {
    if (!active || !visible || !(rate > 0)) return
    let id = 0
    const step = () => {
      const t = nextTick(rate)
      id = window.setTimeout(() => {
        setTotal((v) => v + t.add)
        step()
      }, t.delay)
    }
    step()
    return () => clearTimeout(id)
  }, [active, visible, rate])

  const pick = (i: number) => {
    setSection(i)
    onSectionChange?.(i)
  }
  const toggle = () => {
    setActive((a) => {
      onStatusChange?.(!a)
      return !a
    })
  }
  const dispatch = () => {
    const next = totalRef.current + 1
    setTotal(next)
    setPunch((p) => p + 1)
    setPulse((p) => p + 1)
    onDispatch?.(next)
  }
  const toTop = () => rootRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  const hold = (href?: string) => (e: React.MouseEvent) => {
    if (!href || href === "#") e.preventDefault()
  }

  const vars = {
    "--tsf-bg": background,
    "--tsf-ink": ink,
    "--tsf-muted": muted,
    "--tsf-accent": accent,
    "--tsf-deep": accentDeep,
    "--tsf-aink": accentInk,
    "--tsf-sans": fontSans,
    "--tsf-mono": fontMono,
  } as React.CSSProperties

  const stubClip = chamfer(9, 9, 9, 9)
  const mainClip = chamfer(9, 9, 9, 9)

  return (
    <section
      ref={rootRef}
      className={"tsf w-full " + className}
      style={vars}
      data-seen={seen || reduced ? "1" : "0"}
      aria-label={brand}
    >
      <style>{CSS}</style>
      <div className="tsf-grid">
        {[2, 3, 4, 5, 6, 7].map((c) => (
          <span key={"v" + c} className="tsf-vl" style={{ gridColumn: c }} aria-hidden="true" />
        ))}
        {[2, 3, 4, 5, 6].map((r) => (
          <span key={"h" + r} className="tsf-hl" style={{ gridRow: r }} aria-hidden="true" />
        ))}

        <nav className="tsf-nav" aria-label="Sections">
          <ol>
            {sections.map((s, i) => {
              const inner = (
                <>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span>{s.label}</span>
                </>
              )
              return (
                <li key={s.label + i}>
                  {s.href ? (
                    <a
                      href={s.href}
                      className="tsf-nav-item"
                      aria-current={section === i ? "true" : undefined}
                      onClick={(e) => {
                        hold(s.href)(e)
                        pick(i)
                      }}
                    >
                      {inner}
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="tsf-nav-item"
                      aria-current={section === i ? "true" : undefined}
                      onClick={() => pick(i)}
                    >
                      {inner}
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
          <span className="tsf-nav-bar" style={{ "--i": section } as React.CSSProperties} aria-hidden="true" />
        </nav>

        <div className="tsf-hero">
          <Eyebrow phrases={eyebrow} reduced={reduced} visible={visible} />
          <h2 className="tsf-h">
            {headline.map((line, i) => (
              <span key={i}>
                <span style={{ transitionDelay: 0.12 + i * 0.1 + "s" }}>{line}</span>
              </span>
            ))}
          </h2>
          <p className="tsf-p">{text}</p>
          <a
            href={cta.href ?? "#"}
            className="tsf-cta"
            style={{ clipPath: chamfer(0, 0, 12, 0) }}
            onClick={(e) => {
              hold(cta.href)(e)
              setPulse((p) => p + 1)
              onCtaClick?.()
            }}
          >
            <span>{cta.label}</span>
            <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false">
              <path d="M1 7h11M7.5 2.5 12 7l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </a>
        </div>

        <div className="tsf-side">
          <Orbit reduced={reduced} visible={visible} pulse={pulse} />
          <div className="tsf-links" style={{ "--cols": Math.max(1, linkGroups.length) } as React.CSSProperties}>
            {linkGroups.map((g) => (
              <div key={g.title}>
                <h3>{g.title}</h3>
                <ul>
                  {g.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href ?? "#"} className="tsf-link" onClick={hold(l.href)}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div ref={ticketRef} className="tsf-ticket">
          <button
            type="button"
            className="tsf-stub"
            style={{ clipPath: stubClip }}
            onClick={dispatch}
            aria-label={"Punch the stub: dispatch one ticket (" + formatCount(total) + " solved)"}
          >
            <Mark style={{ transform: "rotate(" + punch * 90 + "deg)" }} />
            <span className="tsf-stub-tip" aria-hidden="true">
              Punch
            </span>
          </button>
          <div className="tsf-main" style={{ clipPath: mainClip }}>
            <div className="tsf-stats">
              <button type="button" className="tsf-status" aria-pressed={active} onClick={toggle}>
                <span className="tsf-stat-v">
                  {active ? statusLabels[0] : statusLabels[1]}
                  <span className="tsf-pulse" aria-hidden="true" />
                </span>
                <span className="tsf-stat-c">
                  {statusCaption} <span className="tsf-status-hint">{active ? "\u00b7 pause" : "\u00b7 resume"}</span>
                </span>
              </button>
              {showCount && <div className="tsf-stat">
                <span className="tsf-stat-v">
                  <span key={punch} className={punch ? "tsf-bump" : undefined}>
                    <Odometer value={total} />
                  </span>
                  <span className="sr-only">{formatCount(total)}</span>
                </span>
                <span className="tsf-stat-c">{countLabel}</span>
              </div>}
            </div>
            <span className="tsf-gutcell" aria-hidden="true" />
            <Blurb text={blurbText} reduced={reduced} visible={visible || ticketVisible} />
            <p className="sr-only">{word}</p>
            <Wordmark
              word={word}
              fontSerif={fontSerif}
              weight={serifWeight}
              color={accentInk}
              halftone={halftone}
              reduced={reduced}
              visible={visible || ticketVisible}
            />
          </div>
        </div>

        <footer className="tsf-foot">
          <span className="tsf-copy">
            &copy; {company ?? brand + " AI"}, {year}
          </span>
          <span className="tsf-foot-l" aria-hidden="true">
            <span className="tsf-dots" />
          </span>
          <div className="tsf-foot-r">
            {legal.map((l) =>
              l.href ? (
                <a key={l.label} href={l.href} onClick={hold(l.href)}>
                  {l.label}
                </a>
              ) : (
                <span key={l.label}>{l.label}</span>
              ),
            )}
            <span className="tsf-dots" aria-hidden="true" />
          </div>
          <button type="button" className="tsf-top" onClick={toTop} aria-label="Back to top">
            <Mark />
          </button>
        </footer>
      </div>
    </section>
  )
}
