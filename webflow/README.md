# eFellows DNA — Webflow setup

A scroll-driven WebGL DNA with headline copy that forms from dots and resolves
into type. Vanilla JS + Three.js (from CDN) — no build step, no framework.

## Files
- **`dna.js`** — the whole experience. Self-contained: it injects its own CSS,
  builds its own canvases, and creates the headline copy. **This is the file you host.**
- **`embed.html`** — the snippet you paste into Webflow.
- **`test.html`** — a bare local page that loads `dna.js` (for previewing the exact
  production build). Not needed in Webflow.

---

## 1 · Host `dna.js`
Webflow's Asset Manager blocks `.js` uploads, so host it anywhere that serves a
raw JS file over HTTPS. Easiest free options:

- **GitHub + jsDelivr:** push `dna.js` to a public repo, then use
  `https://cdn.jsdelivr.net/gh/USER/REPO@main/dna.js`
- **Cloudflare Pages / Netlify:** drop `dna.js` in a project, use its URL.
- Any static host / your own server.

## 2 · Add the embed to Webflow
Webflow → **Page Settings → Custom Code → "Before `</body>` tag"** — paste the
contents of `embed.html`, and replace `YOUR-HOST` with your `dna.js` URL.

That's it — the effect renders full-screen over the page. Custom code only runs on
the **published / `*.webflow.io` site**, not in the Designer, so preview there.

## 3 · Fonts
The headline uses **Upton**, falling back to **Oswald** (loaded automatically).
To use Upton:
- **Option A (recommended):** host `Upton.woff2` next to `dna.js` (or anywhere), and
  set `OPT.fontUrl` at the top of `dna.js` to its URL.
- **Option B:** upload Upton in Webflow → Site Settings → Fonts. Then it's available
  to the resolved type; set `OPT.fontFamily` to match.

Until Upton is provided, everything renders in Oswald (dots + type both).

---

## Editing
Everything editable lives at the **top of `dna.js`**:

- **`COPY`** — the headline copy (3 themes × 3 lines). `at` = scroll position
  (0–1 down the page) where a line starts; `end` = where the theme clears. Wrap
  accent words in `<em>…</em>`.
- **`OPT`** — scroll length (`scrollVh`), font, colours, headline size.
- **`P`** — the DNA look. Paste the JSON from the **"⧉ Copy settings"** button in the
  tuning build (`/index.html`) straight in here.

Re-upload `dna.js` after editing (bump the jsDelivr `@version`/commit or purge cache).

## Notes / gotchas
- Needs internet on load (Three.js is pulled from the jsDelivr CDN via the import map).
- `scrollVh` (default 1100) is the scroll runway. If your Webflow page already has
  enough scrollable height, set `OPT.scrollVh = 0` to disable the injected spacer.
- The DNA sits center-right and text on the left; both are `pointer-events:none`, so
  they never block clicks on your Webflow content.
- Bloom/glow adds GPU cost. It's currently off (`bloomStrength: 0`) in the settings.
- Keep the tuning build (`/index.html`, with the control panel) to dial in new looks,
  then copy the settings into `P`.
