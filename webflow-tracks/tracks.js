/* eFellows — "Twenty-two years, stacked" scroll timeline.
   Self-contained: injects its own CSS and builds the SVG scene inside any
   element carrying [data-tracks]. Vanilla JS, no dependencies, no build step.

   Full scroll experience:   <div data-tracks></div>
   Condensed (Home, static): <div data-tracks="home"></div>
*/
(() => {
  "use strict";

  /* ================= EDIT ME ================= */

  const COPY = {
    title: "Twenty-two years, stacked",
    lede:  "Four tracks, opened along the way. Constantly evolving.",
  };

  // Positions are fractions of the graph width (from the Figma comp 3024:34925).
  // `year` drives the counting ticker between anchors.
  const TRACKS = [
    { yr: "’04", year: 2004, x: 0.000, name: "Infrastructure",                        color: "#E2692F" },
    { yr: "’06", year: 2006, x: 0.219, name: "Defensive Cybersecurity",               color: "#2C60F5" },
    { yr: "’18", year: 2018, x: 0.448, name: "DevOps, Cloud & Platform Eng",          color: "#5AE082" },
    { yr: "’25", year: 2025, x: 0.684, name: "Agentic Engineering & AI/ML Platforms", color: "#A16FFF" },
  ];
  const YEAR_NOW = 2026;                    // where the ticker stops

  const OPT = {
    scrollVh: 700,      // scroll runway (vh) for the full experience. Longer = slower ride.
    gap: 90,            // the chase: each newer line trails the one below by this many px
    smoothing: 0.07,    // scroll easing (lower = floatier)
    bg: "#15191C",      // section background ("" = transparent, inherit the page)
    ink: "#C8D1D6",
    maxWidth: 1273,     // design frame width
    // Brand fonts. If the Webflow site already loads Upton / Proto Mono, leave
    // these empty — the CSS font stack picks them up by family name and falls
    // back to Oswald / JetBrains Mono (auto-loaded from Google Fonts) otherwise.
    uptonUrl: "",       // e.g. "https://cdn…/Upton-Semibold.woff2"
    protoMonoUrl: "",   // e.g. "https://cdn…/ProtoMono-Regular.woff2"
  };

  /* =============== END EDIT ME =============== */

  const NS = "http://www.w3.org/2000/svg";
  const el = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const smooth = t => t * t * (3 - 2 * t);
  const ss = (a, b, x) => smooth(clamp((x - a) / (b - a), 0, 1));
  const YEAR_STOPS = [...TRACKS.map(t => [t.x, t.year]), [1, YEAR_NOW]];

  /* ---------- css + fonts (injected once) ---------- */
  function injectHead() {
    if (document.getElementById("eft-css")) return;
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Oswald"]')) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&family=JetBrains+Mono:wght@400;500&display=swap";
      document.head.appendChild(l);
    }
    const css = document.createElement("style");
    css.id = "eft-css";
    css.textContent = `
      ${OPT.uptonUrl ? `@font-face{ font-family:"Upton"; src:url("${OPT.uptonUrl}") format("woff2"); font-weight:600; font-display:swap; }` : ""}
      ${OPT.protoMonoUrl ? `@font-face{ font-family:"Proto Mono"; src:url("${OPT.protoMonoUrl}") format("woff2"); font-weight:400; font-display:swap; }` : ""}
      .eft-scroll{ position:relative; height:${OPT.scrollVh}vh; ${OPT.bg ? `background:${OPT.bg};` : ""} }
      .eft-sticky{ position:sticky; top:0; height:100vh; display:flex; align-items:center; overflow:hidden; }
      .eft-frame{ width:min(${OPT.maxWidth}px, 100% - 2*clamp(24px,5vw,84px)); margin:0 auto; position:relative;
        color:${OPT.ink}; font-family:"Upton","Oswald",sans-serif; -webkit-font-smoothing:antialiased; }
      .eft-frame header{ position:absolute; left:0; top:0; z-index:2; opacity:0; }
      .eft-frame h2{ font-size:48px; font-weight:600; line-height:.9; letter-spacing:-0.01em; max-width:260px; margin:0; }
      .eft-lede{ font-size:32px; font-weight:600; line-height:1.1; max-width:328px; margin:33px 0 0; }
      .eft-graph{ position:relative; width:100%; }
      .eft-graph svg{ display:block; width:100%; height:auto; overflow:visible; }
      .eft-graph text{ font-family:"Proto Mono","JetBrains Mono",ui-monospace,monospace;
        font-size:14px; letter-spacing:.04em; text-transform:uppercase; }
      .eft-graph .eft-fade{ opacity:0; transition:opacity .5s ease, transform .7s cubic-bezier(.2,.7,.2,1); transform:translateY(6px); }
      .eft-graph .eft-fade.on{ opacity:1; transform:translateY(0); }
      .eft-graph .eft-tick{ font-size:16px; font-weight:500; letter-spacing:.06em; }
      .eft-home .eft-scroll{ height:auto; }
      .eft-home .eft-sticky{ position:static; height:auto; padding:64px 0; overflow:visible; }
      .eft-home .eft-frame header{ position:static; margin-bottom:32px; opacity:1; }
      .eft-home .eft-frame h2{ font-size:36px; }
      .eft-home .eft-lede{ font-size:22px; }
      @media (max-width:820px){
        .eft-frame h2{ font-size:36px; }
        .eft-lede{ font-size:22px; }
        .eft-graph text{ font-size:11px; }
        .eft-frame header{ position:static; margin-bottom:32px; }
      }
    `;
    document.head.appendChild(css);
  }

  /* ---------- one instance ---------- */
  function mount(host) {
    const HOME = (host.getAttribute("data-tracks") || "").trim() === "home";
    const FORCE_RAW = new URLSearchParams(location.search).get("p"); // debug: pin progress
    const FORCE = FORCE_RAW !== null ? parseFloat(FORCE_RAW) : null;

    host.classList.toggle("eft-home", HOME);
    host.innerHTML =
      `<section class="eft-scroll"><div class="eft-sticky"><div class="eft-frame">` +
      `<header><h2></h2><p class="eft-lede"></p></header>` +
      `<div class="eft-graph"></div>` +
      `</div></div></section>`;
    host.querySelector("h2").textContent = COPY.title;
    host.querySelector(".eft-lede").textContent = COPY.lede;
    const zone = host.querySelector(".eft-scroll");
    const hdr = host.querySelector("header");
    const graph = host.querySelector(".eft-graph");

    let W = 0, H = 0, svg, cam, parts = [], texts = [], tickG, tickEl, rideEl, camS = null;
    let leadShown = -1, leadFadeT = 0;
    let LANE = 100, TOP_PAD = 8;
    const GAP = OPT.gap;

    function build() {
      camS = null;
      W = graph.clientWidth;
      if (!W) return;
      LANE = W * (121 / 1356);                    // design lane spacing
      const RISE = LANE * 1.25;
      H = TOP_PAD + LANE * (TRACKS.length - 1) + 140 * (W / 1356);
      graph.innerHTML = "";
      svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
      const defs = el("defs"); svg.appendChild(defs);
      cam = el("g"); svg.appendChild(cam);

      const base = TOP_PAD + LANE * (TRACKS.length - 1);
      parts = []; texts = [];

      TRACKS.forEach((t, i) => {
        const x0 = t.x * W;
        const yLane = base - LANE * i;
        const sw = Math.max(3, 5 * (W / 1356));
        const rise = i === 0 ? 0 : Math.min(RISE, (W - x0) * 0.5);
        const yFrom = yLane + LANE;
        const d = i === 0
          ? `M ${x0} ${yLane} H ${W}`
          : `M ${x0} ${yFrom} C ${x0 + rise * 0.5} ${yFrom}, ${x0 + rise * 0.5} ${yLane}, ${x0 + rise} ${yLane} H ${W}`;

        let stroke = t.color;
        if (i > 0) {                               // seamless joint: parent colour -> own
          const lg = el("linearGradient", { id: `eftg${i}`, gradientUnits: "userSpaceOnUse", x1: x0, y1: 0, x2: x0 + rise * 1.7, y2: 0 });
          lg.append(el("stop", { offset: "0", "stop-color": TRACKS[i - 1].color }),
                    el("stop", { offset: "1", "stop-color": t.color }));
          defs.appendChild(lg);
          stroke = `url(#eftg${i})`;
        }
        const clip = el("clipPath", { id: `eftc${i}` });
        const clipRect = el("rect", { x: x0, y: -60, width: HOME ? W - x0 : 0, height: H + 120 });
        clip.appendChild(clipRect); defs.appendChild(clip);
        cam.appendChild(el("path", { d, fill: "none", stroke, "stroke-width": sw,
          "stroke-linecap": "round", "clip-path": `url(#eftc${i})` }));

        const mkText = (str, ax, ay) => {
          const gg = el("g");
          const txt = el("text", { fill: t.color, class: "eft-fade" + (HOME ? " on" : "") });
          txt.textContent = str;
          gg.appendChild(txt); cam.appendChild(gg);
          texts.push({ el: txt, g: gg, ax, ay });
        };
        const lx = x0 + 12 * (W / 1356);
        mkText(t.name, lx, base + 122 * (W / 1356));   // texts[i*2]   — name
        mkText(t.yr,   lx, base + 90  * (W / 1356));   // texts[i*2+1] — year
        parts.push({ clipRect, x0, rise, yLane, yFrom });
      });

      tickG = el("g");
      tickEl = el("text", { class: "eft-tick", fill: TRACKS[0].color });
      rideEl = el("text", { class: "eft-fade on", y: 26, fill: TRACKS[0].color });
      tickG.append(tickEl, rideEl); cam.appendChild(tickG);
      graph.appendChild(svg);

      // measure after attach (detached SVG text measures 0)
      for (const t of texts)
        t.wpx = Math.max(t.el.getComputedTextLength(), t.el.getBBox().width) + 6;

      // legend layout, two passes: make room right-to-left, resolve left-to-right;
      // if the row can never fit (mobile), wrap to a vertical list.
      const names = texts.filter((t, k) => k % 2 === 0);
      if (names.reduce((a, t) => a + t.wpx, 0) + 26 * 3 > W) {
        TRACKS.forEach((t, i) => {
          texts[i * 2].ax = 52;   texts[i * 2].ay = base + 36 + i * 24;
          texts[i * 2 + 1].ax = 0; texts[i * 2 + 1].ay = base + 36 + i * 24;
        });
      } else {
        const n = names.length;
        names[n - 1].ax = Math.min(names[n - 1].ax, W - names[n - 1].wpx);
        for (let i = n - 2; i >= 0; i--)
          names[i].ax = Math.min(names[i].ax, names[i + 1].ax - 26 - names[i].wpx);
        names[0].ax = Math.max(0, names[0].ax);
        for (let i = 1; i < n; i++)
          names[i].ax = Math.max(names[i].ax, names[i - 1].ax + names[i - 1].wpx + 26);
        TRACKS.forEach((t, i) => { texts[i * 2 + 1].ax = texts[i * 2].ax; });
      }
      apply(cur);
    }

    /* the drive: a time head draws the lines left->right; the camera rides the tip */
    const P_DRAW = [0.00, 0.84];
    const P_WIDE = [0.84, 1.00];
    const zoomAt = p => {
      const K = [[0, 4.2], [0.15, 3.8], [0.35, 3.0], [0.55, 2.6], [0.75, 2.05], [0.84, 1.8], [1, 1]];
      for (let i = 0; i < K.length - 1; i++)
        if (p <= K[i + 1][0]) return Math.exp(lerp(Math.log(K[i][1]), Math.log(K[i + 1][1]), smooth((p - K[i][0]) / (K[i + 1][0] - K[i][0]))));
      return 1;
    };
    const tipOf = (pt, tip) => {
      if (tip <= pt.x0) return { x: pt.x0, y: pt.rise ? pt.yFrom : pt.yLane };
      if (pt.rise && tip < pt.x0 + pt.rise)
        return { x: tip, y: lerp(pt.yFrom, pt.yLane, smooth((tip - pt.x0) / pt.rise)) };
      return { x: tip, y: pt.yLane };
    };

    function apply(p) {
      if (!cam || !parts.length || HOME) return;
      const drawT = ss(P_DRAW[0], P_DRAW[1], p);
      const head = lerp(parts[0].x0, W * 1.30 + GAP * 3, drawT);

      let frontier = { x: parts[0].x0, y: parts[0].yLane }, lead = 0;
      const bornFlags = [];
      parts.forEach((pt, i) => {
        const tip = clamp(head - i * GAP, pt.x0, W * 1.30);
        const born = tip > pt.x0 + 1;
        pt.clipRect.setAttribute("width", born ? Math.max(0, tip - pt.x0) : 0);
        if (born) { lead = i; frontier = tipOf(pt, Math.min(tip, W)); }
        bornFlags[i] = born;
      });

      const z0 = zoomAt(p);
      const wide = ss(P_WIDE[0], P_WIDE[1], p);

      // legend fades in place at the build-out; the ride carries only the chyron
      const showAll = wide > 0.15;
      TRACKS.forEach((t, i) => {
        texts[i * 2].el.classList.toggle("on", bornFlags[i] && showAll);
        texts[i * 2 + 1].el.classList.toggle("on", bornFlags[i] && showAll);
      });

      // camera: a newborn line grows from its date anchor, then tip-following
      // takes over; the camera itself is smoothed so hand-offs glide.
      const zDes = Math.exp(lerp(Math.log(z0), 0, wide));
      const cxDes = lerp(Math.max(frontier.x - 0.12 * W / z0, parts[lead].x0 + 0.40 * W / z0), W / 2, wide);
      const cyDes = lerp(frontier.y, H / 2, wide);
      if (!camS || FORCE !== null) camS = { x: cxDes, y: cyDes, z: zDes };
      else {
        const k = 0.1;
        camS.x += (cxDes - camS.x) * k;
        camS.y += (cyDes - camS.y) * k;
        camS.z = Math.exp(Math.log(camS.z) + (Math.log(zDes) - Math.log(camS.z)) * k);
      }
      const z = camS.z, cx = camS.x, cy = camS.y;
      const r = svg.getBoundingClientRect();
      const anchorY = lerp(innerHeight / 2 - r.top, H / 2, wide);
      cam.setAttribute("transform", `translate(${W / 2 - z * cx} ${anchorY - z * cy}) scale(${z})`);

      // text stays UI-sized and never travels: counter-scaled at its position
      const inv = 1 / z;
      for (const t of texts)
        t.g.setAttribute("transform", `translate(${t.ax} ${t.ay}) scale(${inv})`);

      // the year ticks by as you travel; the current track's title crossfades
      // beneath it, one by one: '04 Infrastructure -> '06 Defensive Cybersecurity…
      const fx = frontier.x / W;
      let yrNow = YEAR_NOW;
      for (let i = 0; i < YEAR_STOPS.length - 1; i++) {
        const [xa, ya] = YEAR_STOPS[i], [xb, yb] = YEAR_STOPS[i + 1];
        if (fx <= xb) { yrNow = Math.floor(lerp(ya, yb, (fx - xa) / (xb - xa))); break; }
      }
      if (lead !== leadShown) { leadShown = lead; leadFadeT = performance.now(); }
      const bornT = Math.min(1, (performance.now() - leadFadeT) / 450);
      const hide = 1 - ss(0, 0.4, wide);
      const camLeft = cx - (W / 2) / z;
      const camBot = (innerHeight - r.top - anchorY) / z + cy;
      tickEl.textContent = "’" + String(yrNow).slice(2);
      tickEl.setAttribute("fill", TRACKS[lead].color);
      tickEl.style.opacity = hide;
      rideEl.textContent = TRACKS[lead].name;
      rideEl.setAttribute("fill", TRACKS[lead].color);
      rideEl.style.opacity = bornT * hide;
      tickG.setAttribute("transform", `translate(${camLeft + 28 / z} ${camBot - 92 / z}) scale(${inv})`);

      const h = ss(0.88, 0.98, p);
      hdr.style.opacity = h;
      hdr.style.transform = `translateY(${(1 - h) * 14}px)`;
    }

    /* loop */
    let cur = FORCE ?? (HOME ? 1 : 0), done = false;
    function targetP() {
      if (FORCE !== null) return FORCE;
      const zr = zone.getBoundingClientRect();
      const runway = zone.offsetHeight - innerHeight;
      const raw = clamp(-zr.top / runway, 0, 1);
      if (raw >= 0.995) done = true;      // scrubs both ways mid-sequence…
      return done ? 1 : raw;              // …locks once the story has finished
    }
    function loop() {
      if (graph.clientWidth !== W && graph.clientWidth > 0) build();
      const target = targetP();
      cur += (target - cur) * OPT.smoothing;
      if (Math.abs(target - cur) < 0.0004) cur = target;
      apply(cur);
      requestAnimationFrame(loop);
    }

    build();
    addEventListener("resize", build);
    document.fonts.ready.then(build);
    document.fonts.addEventListener("loadingdone", build);
    if (!HOME) requestAnimationFrame(loop);
  }

  /* ---------- boot ---------- */
  function boot() {
    const hosts = document.querySelectorAll("[data-tracks]");
    if (!hosts.length) return;
    injectHead();
    hosts.forEach(mount);
  }
  document.readyState === "loading" ? addEventListener("DOMContentLoaded", boot) : boot();
})();
