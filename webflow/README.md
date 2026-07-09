# eFellows DNA — Webflow setup

A scroll-driven WebGL DNA where every headline is **drawn from the helix**: real
dots detach from the strands, fly into the letters (gaining the line's colour),
dissolve into the crisp type, then drift back into the DNA. It closes on a big
centered finale. Vanilla JS + Three.js (from CDN) — no build step, no framework.

## Files
- **`dna.js`** — the whole experience. Self-contained: injects its own CSS,
  builds its own canvases + copy. **This is the file you host.**
- **`embed.html`** — the snippet you paste into Webflow.
- **`test.html`** — a bare local page that loads `dna.js` (to preview the exact
  production build). Not needed in Webflow.

---

## 1 · Host `dna.js`
Webflow's Asset Manager blocks `.js` uploads, so host it anywhere that serves a
raw JS file over HTTPS:

- **GitHub + jsDelivr:** push `dna.js` to a public repo, then use
  `https://cdn.jsdelivr.net/gh/USER/REPO@main/dna.js`
- **Cloudflare Pages / Netlify:** drop `dna.js` in a project, use its URL.
- Any static host / your own server.

## 2 · Add the embed to Webflow
Webflow → **Page Settings → Custom Code → "Before `</body>` tag"** — paste the
contents of `embed.html`, and replace `YOUR-HOST` with your `dna.js` URL.

The effect renders full-screen over the page. Custom code only runs on the
**published / `*.webflow.io` site**, not in the Designer — so preview there.

## 3 · Fonts
The headline uses **Upton**, falling back to **Oswald** (loaded automatically).
Host `Upton.woff2` anywhere HTTPS and set `OPT.fontUrl` at the top of `dna.js` to
its URL. Until then everything renders in Oswald. The type is **semibold (600)**,
which needs the 600 weight in the font file to render as true semibold.

---

## Editing
Everything editable lives at the **top of `dna.js`** in three blocks.

### `COPY` — the words
```js
const COPY = {
  themes: [                       // 3 themes, each shown in turn
    { hi: "#E2692F", lines: [     // hi = this theme's highlight (accent) colour
      { at: -0.02, html: "Clients trust us because" },              // line 1 = setup
      { at: 0.09,  html: "we are professional skeptics" },          // line 2 ┐ couplet
      { at: 0.09,  html: "<em>and think from first principles</em>" }, // line 3 ┘ (shown together)
    ]},
    // …theme 2, theme 3…
  ],
  finale: [                       // the centered payoff title
    { at: 0.885, html: "Well architected." },
    { at: 0.905, html: "Exceptionally delivered." },
  ],
};
```
Rules of thumb:
- Each theme **must have exactly 3 lines**. Line 1 is a standalone *setup* that
  appears then leaves; lines 2 & 3 are a *couplet* revealed together.
- `at` = scroll position (0–1 down the page) where a line starts forming. Lines
  are revealed **one at a time** and reuse a single pool of dots, so keep them in
  order with a little gap between each (the couplet reads line 2's `at`; line 3's
  is ignored). The finale runs last, near `at: 0.88+`.
- Wrap the accent line in `<em>…</em>`; it takes that theme's `hi` colour.
- Keep the copy on the shorter side — the type auto-shrinks to fit one line on
  narrower screens, but very long lines get small.

### `OPT` — layout & type
```js
scrollVh   // scroll runway length (vh). 2000 by default. Set 0 if your page already scrolls.
fontUrl    // URL to Upton.woff2 ("" = fall back to Oswald)
fontFamily // resolved type + the font the dots are sampled from
textColor  // body headline + finale colour
accent     // brand accent (unused by default)
```
Font size is **responsive** (`clamp(30px, 6.8vw, 64px)`) so lines never wrap —
adjust that clamp in the injected CSS near the top of `dna.js` for a different
size ceiling.

### `P` — the DNA look
Paste the JSON from the **"⧉ Copy settings"** button in the tuning build
(`/index.html`, press **H** to reveal the panel) straight in here.

Re-upload `dna.js` after editing (bump the jsDelivr `@version`/commit or purge cache).

## Notes / gotchas
- Needs internet on load (Three.js is pulled from the jsDelivr CDN via the import map).
- `scrollVh` (2000) is the scroll runway. If your Webflow page already has enough
  scrollable height, set `OPT.scrollVh = 0` to skip the injected spacer.
- The DNA + text are `pointer-events:none`, so they never block clicks on Webflow content.
- After **~5s idle** the page gently auto-scrolls itself to nudge new visitors; any
  real scroll/tap stops it.
- Respects `prefers-reduced-motion` (freezes the ambient motion).
- Bloom/glow adds GPU cost; it's off by default (`bloomStrength: 0`) in the settings.
- Keep the tuning build (`/index.html`) to dial in new DNA looks, then copy the
  settings into `P`.
