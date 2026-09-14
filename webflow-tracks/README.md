# eFellows "Twenty-two years, stacked" — Webflow setup

A scroll-driven timeline of four expertise tracks (Figma comp `3024:34925`).
As you scroll, the camera rides zoomed-in along the lines while they draw
left→right — each newer track chasing the one below, a year ticker counting
'04 → '26 with the current track's title crossfading beneath it — then pulls
back to the full composition with the legend and header fading in place.
Vanilla JS + SVG, no dependencies, no build step.

## Files
- **`tracks.js`** — the whole experience. Self-contained: injects its own CSS,
  builds the SVG scene. **This is the file you host.**
- **`embed.html`** — the snippet you paste into Webflow.
- **`test.html`** — a bare local page that loads `tracks.js` (both variants).
  Not needed in Webflow.

---

## 1 · Host `tracks.js`
Webflow's Asset Manager blocks `.js` uploads, so host it anywhere that serves a
raw JS file over HTTPS:

- **GitHub + jsDelivr:** push `tracks.js` to a public repo, then use
  `https://cdn.jsdelivr.net/gh/USER/REPO@main/tracks.js`
- **Cloudflare Pages / Netlify:** drop `tracks.js` in a project, use its URL.
- Any static host / your own server.

## 2 · Add it to Webflow
Two pieces (both in `embed.html`):

1. An **Embed element** where the timeline should appear:
   - Expertise hub (full scroll experience): `<div data-tracks></div>`
   - Home (condensed, static end-state):     `<div data-tracks="home"></div>`
2. The script tag in **Page Settings → Custom Code → before `</body>`**,
   with `YOUR-HOST` replaced by your `tracks.js` URL.

The full variant creates its own scroll runway (`700vh` by default) with a
sticky viewport inside it — no extra wrapper needed. Custom code only runs on
the **published / `*.webflow.io` site**, not in the Designer.

## 3 · Fonts
- Header: **Upton** (semibold), falling back to **Oswald** (auto-loaded from
  Google Fonts).
- Labels/years: **Proto Mono**, falling back to **JetBrains Mono** (auto-loaded).

If the Webflow site already loads Upton / Proto Mono, nothing to do — the CSS
picks them up by family name. Otherwise host the `.woff2` files anywhere HTTPS
and set `OPT.uptonUrl` / `OPT.protoMonoUrl` at the top of `tracks.js`.

---

## Editing
Everything editable lives at the **top of `tracks.js`**:

- **`COPY`** — the header title + lede.
- **`TRACKS`** — the four tracks: year label, ticker year, horizontal position
  (fraction of the width, from the design), name, colour. Adding/removing a
  track Just Works — lanes, gradients, legend and ticker all derive from this
  array.
- **`YEAR_NOW`** — where the ticker stops counting.
- **`OPT`** —
  | key | meaning |
  |---|---|
  | `scrollVh` | scroll runway length (vh). Longer = slower ride. 700 default. |
  | `gap` | the chase: px each newer line trails the one below. |
  | `smoothing` | scroll easing (lower = floatier). |
  | `bg` | section background (`""` = transparent, inherit the page). |
  | `maxWidth` | design frame width (1273). |
  | `uptonUrl` / `protoMonoUrl` | optional brand-font `.woff2` URLs. |

Re-upload `tracks.js` after editing (bump the jsDelivr `@version`/commit or
purge cache).

## Behaviour notes
- **Draw + chase:** lines draw strictly left→right from their inception year;
  each newer track's tip trails the one below by `OPT.gap` px.
- **Titles one by one:** while riding, the counting year + current track name
  sit at the bottom-left of the viewport, crossfading on each hand-off; they
  yield to the full legend at the build-out. Legend text fades in at its final
  design position — it never travels.
- **Scroll latch:** mid-sequence, scrolling back rewinds; once the story has
  fully built, it locks — scrolling back up keeps the finished graphic.
- **Mobile:** when the legend row can't fit, it wraps to a vertical
  year-name list; the header returns to normal flow above the graph.
- **Debug:** append `?p=0.5` to any page URL to pin scroll progress (0–1) for
  QA of a specific moment.
