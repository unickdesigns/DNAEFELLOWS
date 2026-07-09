/* ============================================================================
   eFellows — scroll-driven DNA (Webflow build)
   Self-contained: injects its own CSS, builds its own canvases + copy.
   Loads via the importmap + <script type="module" src="dna.js"> in the embed.
   Edit COPY / OPT / P below, then re-host this file.

   How it reads: each theme shows line 1 (a "setup"), then lines 2 & 3 together
   (a "couplet"). Every headline is DRAWN FROM the DNA — real helix dots detach,
   fly into the letters (gaining the line's colour), then dissolve into the crisp
   type and drift back into the helix. The finale ("Well architected. …") is the
   same trick at full scale.
   ============================================================================ */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/* ================================ EDIT ME ================================= */

// Headline copy. Each theme MUST have exactly 3 lines:
//   line 1 = setup (appears, then leaves), lines 2 & 3 = couplet (shown together).
// `at` = scroll position (0..1 down the page) where the line begins forming.
//   Lines are revealed sequentially and reuse one pool of dots, so keep the order
//   and rough spacing — the couplet reads line 2's `at` (line 3's `at` is ignored).
// `hi` = the couplet's highlight (accent) colour for that theme. Wrap the accent
//   line in <em>…</em>.
const COPY = {
  themes: [
    { hi: "#E2692F", lines: [
      { at: -0.02, html: "Clients trust us because" },
      { at: 0.09,  html: "we are professional skeptics" },
      { at: 0.09,  html: "<em>and think from first principles</em>" },
    ]},
    { hi: "#2C60F5", lines: [
      { at: 0.25, html: "Clients avoid repeated problems because" },
      { at: 0.36, html: "we suffer from chronic curiosity" },
      { at: 0.36, html: "<em>and think from first principles</em>" },
    ]},
    { hi: "#5AE082", lines: [
      { at: 0.52, html: "Clients hire us to build systems because" },
      { at: 0.63, html: "we are methodical" },
      { at: 0.63, html: "<em>so we enforce formalism</em>" },
    ]},
  ],
  // the payoff title (centered, big). Two lines that form together at the end.
  finale: [
    { at: 0.885, html: "Well architected." },
    { at: 0.905, html: "Exceptionally delivered." },
  ],
};

const OPT = {
  scrollVh:   2000,                            // scroll runway length (vh). Set 0 if your page already scrolls.
  fontUrl:    "",                              // URL to Upton.woff2 (leave "" to fall back to Oswald)
  fontFamily: '"Upton","Oswald",sans-serif',  // resolved type + the font the dots are sampled from
  textColor:  "#C8D1D6",                       // body headline colour + finale colour
  accent:     "#c85f2c",                       // brand accent (finale period etc.) — unused by default
};

// DNA look — paste the "⧉ Copy settings" JSON from the tuning build (/index.html) here.
const P = {
  dotSize: 2, countA: 500, countB: 500, ambient: 0,
  lineWidth: 0.425, ribbonWidth: 0.49,
  rungPairs: 8, rungDensity: 50, rungThickness: 0.33, rungBoost: 3.05,
  radius: 3.15, turns: 0.65, height: 13, helixX: 1.7, camDistance: 10.25, sway: 0.6,
  bloomStrength: 0.0, bloomRadius: 0.0, bloomThreshold: 0.0,
  bgColor: "#0b0d0e", dotColorA: "#5b676d", dotColorB: "#5b676d",
};

/* ========================================================================= */

/* ---- inject fonts + styles + DOM (nothing needed in the Webflow markup) --- */
(function injectFonts() {
  const g = document.createElement("link");
  g.rel = "stylesheet";
  g.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600&display=swap";
  document.head.appendChild(g);
})();

const GRAIN = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const style = document.createElement("style");
style.textContent = `
${OPT.fontUrl ? `@font-face{font-family:"Upton";src:url("${OPT.fontUrl}") format("woff2");font-weight:300 700;font-style:normal;font-display:swap;}` : ""}
html{ background:#04060a; overflow-x:clip; }
#dna-gl,#dna-txt{ position:fixed; inset:0; width:100vw; height:100vh; display:block; pointer-events:none; }
#dna-gl{ z-index:0; } #dna-txt{ z-index:5; }
.dna-vignette{ position:fixed; inset:0; z-index:2; pointer-events:none;
  background:radial-gradient(120% 120% at 65% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,.55) 100%); mix-blend-mode:multiply; }
.dna-grain{ position:fixed; inset:-50%; z-index:3; pointer-events:none; opacity:.05; background-image:url("${GRAIN}"); }
.dna-scrim{ position:fixed; inset:0; z-index:4; pointer-events:none; opacity:0;
  background:radial-gradient(62% 46% at 50% 50%, rgba(2,4,7,.62) 0%, rgba(2,4,7,.40) 44%, rgba(2,4,7,0) 78%); will-change:opacity; }
.dna-overlay{ position:fixed; inset:0; z-index:4; pointer-events:none; }
.dna-theme{ position:fixed; top:50%; left:clamp(24px,7vw,150px); max-width:none; transform:translateY(-50%); }
.dna-line{ font-family:${OPT.fontFamily}; font-weight:600; font-size:clamp(30px,6.8vw,64px); white-space:nowrap;
  line-height:1.05; letter-spacing:-0.01em; color:${OPT.textColor}; text-shadow:0 2px 40px rgba(4,8,14,.6);
  margin:0 0 .1em; opacity:0; will-change:opacity,filter; }
.dna-line em{ font-style:normal; }
.dna-finale{ position:fixed; left:0; right:0; top:50%; transform:translateY(-50%); z-index:5; pointer-events:none; text-align:center; }
.dna-fline{ font-family:${OPT.fontFamily}; font-weight:600; font-size:clamp(64px,12vw,160px); line-height:0.98;
  letter-spacing:-0.015em; color:${OPT.textColor}; text-shadow:0 4px 60px rgba(4,8,14,.7);
  margin:0; opacity:0; will-change:opacity,filter; }
.dna-scrollspace{ height:${OPT.scrollVh}vh; position:relative; z-index:1; pointer-events:none; }
@media (max-width:760px){
  .dna-theme{ left:20px; right:20px; max-width:none; top:50%; bottom:auto; transform:translateY(-50%); text-align:center; }
  .dna-line{ font-size:clamp(30px,9vw,64px); white-space:normal; }
  .dna-fline{ font-size:clamp(40px,11.5vw,92px); }
}`;
document.head.appendChild(style);

const glCanvas  = Object.assign(document.createElement("canvas"), { id: "dna-gl" });
const txtCanvas = Object.assign(document.createElement("canvas"), { id: "dna-txt" });
const vignette  = Object.assign(document.createElement("div"), { className: "dna-vignette" });
const grain     = Object.assign(document.createElement("div"), { className: "dna-grain" });
const scrim     = Object.assign(document.createElement("div"), { className: "dna-scrim", id: "dna-scrim" });
const overlay   = Object.assign(document.createElement("div"), { className: "dna-overlay" });
document.body.append(glCanvas, vignette, grain, scrim, txtCanvas, overlay);

COPY.themes.forEach((theme) => {
  const th = document.createElement("div");
  th.className = "dna-theme";
  theme.lines.forEach((l) => {
    const p = document.createElement("p");
    p.className = "dna-line"; p.dataset.appear = l.at; p.innerHTML = l.html;
    const em = p.querySelector("em"); if (em) em.style.color = theme.hi;   // per-theme highlight colour
    th.appendChild(p);
  });
  overlay.appendChild(th);
});
const finaleEl = document.createElement("div");
finaleEl.className = "dna-finale"; finaleEl.id = "dna-finale";
COPY.finale.forEach((l) => {
  const p = document.createElement("p");
  p.className = "dna-fline"; p.dataset.appear = l.at; p.innerHTML = l.html;
  finaleEl.appendChild(p);
});
overlay.appendChild(finaleEl);
if (OPT.scrollVh > 0) document.body.appendChild(Object.assign(document.createElement("div"), { className: "dna-scrollspace" }));

/* ---------------------------- math helpers -------------------------------- */
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp  = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const bump  = (x, c, w) => { const d = (x - c) / w; return Math.exp(-(d * d)); };
const gauss = () => { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* --------------------- renderer / scene / camera -------------------------- */
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

const bgCanvas = document.createElement("canvas");
bgCanvas.width = bgCanvas.height = 512;
const bgx = bgCanvas.getContext("2d");
const bgTex = new THREE.CanvasTexture(bgCanvas);
bgTex.colorSpace = THREE.SRGBColorSpace;
scene.background = bgTex;
function setBg(hex) {
  const c = new THREE.Color(hex);
  const g = bgx.createRadialGradient(512 * 0.66, 512 * 0.36, 30, 512 * 0.66, 512 * 0.36, 620);
  g.addColorStop(0.0, "#" + c.clone().multiplyScalar(1.30).getHexString());
  g.addColorStop(0.5, "#" + c.getHexString());
  g.addColorStop(1.0, "#" + c.clone().multiplyScalar(0.72).getHexString());
  bgx.fillStyle = g; bgx.fillRect(0, 0, 512, 512);
  bgTex.needsUpdate = true;
}
setBg(P.bgColor);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0.6, 0, 15);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.72, 0.62, 0.0);
composer.addPass(bloom);
const render = () => composer.render();

/* --------------------------- DNA geometry --------------------------------- */
// strand ids: 0 = backbone A, 1 = backbone B, 2 = rungs, 3 = ambient dust
const PHASE_B = Math.PI;
const hlLocal = new THREE.Vector3();
const _defPos = new THREE.Vector3(), _nearPos = new THREE.Vector3(), _hlWorld = new THREE.Vector3(), _tgt = new THREE.Vector3();

let geo = null, dna = null;
// real strand/rung points sampled from the built helix, so the finale text can be
// literally DRAWN FROM the DNA (dots peel off these points, projected live each frame)
let helixSrc = [];
const helixScreen = [];
const _proj = new THREE.Vector3();
function buildDNA() {
  const H = P.height, R = P.radius, TURNS = P.turns;
  const positions = [], births = [], strands = [], sizes = [], seeds = [], highlights = [], rdirs = [];
  const push = (x, y, z, birth, strand, size, dx, dz) => {
    positions.push(x, y, z); births.push(birth); strands.push(strand);
    sizes.push(size); seeds.push(Math.random()); highlights.push(0);
    rdirs.push(dx || 0, 0, dz || 0);
  };
  for (const [count, phase, strand] of [[P.countA, 0, 0], [P.countB, PHASE_B, 1]]) {
    for (let i = 0; i < count; i++) {
      const t = i / count, birth = 0.02 + t * 0.95, y = (t - 0.5) * H, ang = t * TURNS * TAU + phase;
      const rx = Math.cos(ang), rz = Math.sin(ang), tx = -Math.sin(ang), tz = Math.cos(ang);
      const jr = gauss() * P.lineWidth, jt = gauss() * P.ribbonWidth;
      push(rx * R + rx * jr + tx * jt, y + gauss() * 0.09, rz * R + rz * jr + tz * jt, birth, strand, 0.5 + Math.random() * 0.6);
    }
  }
  for (let m = 0; m < P.rungPairs; m++) {
    const t = (m + 0.5) / Math.max(P.rungPairs, 1), birth = 0.02 + t * 0.95, y = (t - 0.5) * H, ang = t * TURNS * TAU;
    const ax = Math.cos(ang) * R, az = Math.sin(ang) * R, bx = Math.cos(ang + PHASE_B) * R, bz = Math.sin(ang + PHASE_B) * R;
    let ddx = bx - ax, ddz = bz - az; const dl = Math.hypot(ddx, ddz) || 1; ddx /= dl; ddz /= dl;
    for (let k = 0; k < P.rungDensity; k++) {
      const u = Math.random();
      push(lerp(ax, bx, u) + gauss() * 0.05, y + (Math.random() - 0.5) * P.rungThickness, lerp(az, bz, u) + gauss() * 0.05, birth, 2, 0.45 + Math.random() * 0.5, ddx, ddz);
    }
  }
  for (let i = 0; i < P.ambient; i++) {
    const r = 4.5 + Math.random() * 11, a = Math.random() * TAU;
    push(Math.cos(a) * r, (Math.random() - 0.5) * H * 1.4, Math.sin(a) * r, 0, 3, 0.3 + Math.random() * 0.45);
  }
  const target = Math.min(Math.floor(P.countA * 0.5), (positions.length / 3) - 1);
  if (target >= 0) { highlights[target] = 1; hlLocal.set(positions[target * 3], positions[target * 3 + 1], positions[target * 3 + 2]); }

  // subsample real backbone + rung points (skip ambient dust), sorted bottom→top,
  // so finale text-dots can be born ON the helix at their own height
  helixSrc = [];
  for (let i = 0, N = positions.length / 3; i < N; i++) {
    if (strands[i] >= 2.5) continue;
    if (Math.random() < 0.16) helixSrc.push(new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]));
  }
  helixSrc.sort((a, b) => a.y - b.y);
  helixScreen.length = helixSrc.length;

  const g = new THREE.BufferGeometry();
  g.setAttribute("position",   new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("aBirth",     new THREE.Float32BufferAttribute(births, 1));
  g.setAttribute("aStrand",    new THREE.Float32BufferAttribute(strands, 1));
  g.setAttribute("aSize",      new THREE.Float32BufferAttribute(sizes, 1));
  g.setAttribute("aSeed",      new THREE.Float32BufferAttribute(seeds, 1));
  g.setAttribute("aHighlight", new THREE.Float32BufferAttribute(highlights, 1));
  g.setAttribute("aRungDir",   new THREE.Float32BufferAttribute(rdirs, 3));
  // morph: per-vertex letter target + recruit group + tint colour (filled by recruitPools)
  g.setAttribute("aTextTarget", new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3));
  g.setAttribute("aRecruit",    new THREE.Float32BufferAttribute(new Float32Array(positions.length / 3), 1));
  g.setAttribute("aTextColor",  new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3));
  if (geo) geo.dispose();
  geo = g;
  if (dna) dna.geometry = g;
}
buildDNA();

/* ---------------------------- shader material ----------------------------- */
const uniforms = {
  uTime: { value: 0 }, uRevealA: { value: 0 }, uRevealB: { value: 0 }, uRevealR: { value: 0 },
  uFocus: { value: 0 }, uSize: { value: P.dotSize }, uConnect: { value: 0 }, uIntro: { value: 0 },
  uMorph: { value: 0 }, uMorphFade: { value: 0 }, uActiveGroup: { value: 0 },
  uRungBoost: { value: P.rungBoost }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  uColorA: { value: new THREE.Color(P.dotColorA) }, uColorB: { value: new THREE.Color(P.dotColorB) },
  uColorHi: { value: new THREE.Color(0xd2dadf) },
};

const material = new THREE.ShaderMaterial({
  uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    attribute float aBirth; attribute float aStrand; attribute float aSize; attribute float aSeed;
    attribute float aHighlight; attribute vec3 aRungDir; attribute vec3 aTextTarget; attribute float aRecruit; attribute vec3 aTextColor;
    uniform float uTime, uRevealA, uRevealB, uRevealR, uFocus, uSize, uPixelRatio, uConnect, uRungBoost, uIntro, uMorph, uMorphFade, uActiveGroup;
    varying float vAlpha; varying float vGlow; varying float vStrand; varying vec3 vTint; varying float vTintAmt;
    void main(){
      vStrand = aStrand;
      float rv = uRevealA;
      if (aStrand > 2.5) rv = 1.0; else if (aStrand > 1.5) rv = uRevealR; else if (aStrand > 0.5) rv = uRevealB;
      float grow = (aStrand > 2.5) ? 1.0 : smoothstep(aBirth, aBirth + 0.07, rv);
      float pop = exp(-pow((rv - aBirth) / 0.05, 2.0)) * step(aBirth, rv);
      vec3 p = position;
      p.x += sin(uTime * 0.6 + aSeed * 6.2831) * 0.022;
      p.y += cos(uTime * 0.5 + aSeed * 6.0) * 0.022;
      float iAppear = smoothstep(aBirth * 0.5, aBirth * 0.5 + 0.5, uIntro);
      p += vec3(sin(aSeed * 121.0), cos(aSeed * 77.0), sin(aSeed * 49.0)) * (1.0 - iAppear) * 3.2;
      // MORPH: the active recruit group's dots leave the strand and set into their WORLD-space
      // letters (via viewMatrix) so the type stays steady while the DNA keeps swaying
      float grpOn = (aRecruit > 0.5 && abs(aRecruit - uActiveGroup) < 0.5) ? 1.0 : 0.0;
      float rStag = fract(aSeed * 51.7);
      float rMove = smoothstep(rStag * 0.4, rStag * 0.4 + 0.6, uMorph);
      float rec = grpOn * rMove;
      vec4 mv = mix(modelViewMatrix * vec4(p, 1.0), viewMatrix * vec4(aTextTarget, 1.0), rec);
      grow = max(grow, rec);
      // narrative dots gain their theme colour as they're pulled out (gradient); finale stays slate
      vTint = aTextColor;
      vTintAmt = (aRecruit > 0.5 && aRecruit < 3.5) ? rec : 0.0;
      float dist = max(-mv.z, 0.001);
      float size = uSize * aSize * grow * (1.0 + pop * 0.6);
      vGlow = 0.0;
      if (aHighlight > 0.5) { vGlow = uFocus; size *= 1.0 + uFocus * 4.0; }
      float twinkle = 0.72 + 0.28 * sin(uTime * 1.6 + aSeed * 30.0);
      size *= 1.0 + uConnect * 0.12;
      gl_PointSize = size * uPixelRatio * (90.0 / dist);
      gl_Position = projectionMatrix * mv;
      float strandAlpha = (aStrand > 2.5) ? 0.35 : (aStrand > 1.5 ? uRungBoost : 1.0);
      float depthFade = mix(0.45, 1.0, smoothstep(18.0, 8.0, dist));
      vAlpha = grow * twinkle * strandAlpha * depthFade * (1.0 + uConnect * 0.5) * iAppear;
      if (aStrand > 1.5 && aStrand < 2.5) {
        vec3 vd = (modelViewMatrix * vec4(aRungDir, 0.0)).xyz;
        float ef = mix(1.0, 0.08, smoothstep(0.5, 0.88, abs(normalize(vd).z)));
        vAlpha *= mix(ef, 1.0, rec);
      }
      vAlpha *= 1.0 - grpOn * uMorphFade;
    }`,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform vec3 uColorA, uColorB, uColorHi;
    varying float vAlpha; varying float vGlow; varying float vStrand; varying vec3 vTint; varying float vTintAmt;
    void main(){
      vec2 uv = gl_PointCoord - 0.5; float d = length(uv);
      float core = smoothstep(0.5, 0.06, d); float halo = smoothstep(0.5, 0.2, d);
      vec3 col = mix(uColorA, uColorB, clamp(vStrand, 0.0, 1.0));
      col = mix(col, uColorHi, vGlow);
      col = mix(col, vTint, vTintAmt);
      float a = core * vAlpha * 0.5 + halo * vAlpha * 0.12;
      a += vGlow * core * 0.8;
      if (a < 0.004) discard;
      gl_FragColor = vec4(col, a);
    }`,
});

dna = new THREE.Points(geo, material);
const helix = new THREE.Group();
helix.add(dna);
helix.position.x = P.helixX;
helix.rotation.z = 0.08;
scene.add(helix);

/* --------------------------- scroll + pointer ----------------------------- */
let targetP = 0, progress = 0, mx = 0, my = 0, tmx = 0, tmy = 0;
let formProgress = 0;   // time-driven formation of the on-load headline
function readScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  targetP = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
}
window.addEventListener("scroll", readScroll, { passive: true });
readScroll();
window.addEventListener("pointermove", (e) => { tmx = (e.clientX / window.innerWidth) * 2 - 1; tmy = (e.clientY / window.innerHeight) * 2 - 1; });

/* ---- idle auto-scroll (nudge new visitors) ---- */
let lastInteract = performance.now(), userEngaged = false, autoAccum = 0, autoActiveT = 0;
const IDLE_MS = 5000;
function markInteract() { lastInteract = performance.now(); if (window.scrollY > 6) userEngaged = true; }
["wheel", "touchstart", "touchmove", "keydown", "pointerdown"].forEach(ev => window.addEventListener(ev, markInteract, { passive: true }));

/* --------------------------------- refs ----------------------------------- */
const themes = [...overlay.querySelectorAll(".dna-theme")];
const isMobile = () => window.innerWidth <= 760;
const tctx = txtCanvas.getContext("2d");
const TEXT_COL = OPT.textColor;
const ACC_RGB = (() => { const c = new THREE.Color(OPT.accent); return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]; })();
let textLines = [];
let morphSeq = [];       // narrative entries in scroll order, each reusing the shared dot pool
let narrativePool = [];  // real-dot pool (group 1) reassigned to whichever entry is forming
let loadedLineIdx = -1;  // which morphSeq entry the pool currently points at

// rasterize one line offscreen, sample the letterforms into dot targets
function sampleLine(ln, finale) {
  const rect = ln.getBoundingClientRect();
  const W = Math.max(2, Math.ceil(rect.width)), H = Math.max(2, Math.ceil(rect.height) + 8);
  const cs = getComputedStyle(ln);
  const fontPx = parseFloat(cs.fontSize);            // read the ACTUAL (responsive) rendered type
  const weight = parseInt(cs.fontWeight) || 600;
  const lsp = parseFloat(cs.letterSpacing) || 0;
  const lh = fontPx * (finale ? 0.98 : 1.05);
  const centered = finale || isMobile();
  const oc = document.createElement("canvas"); oc.width = W; oc.height = H;
  const c = oc.getContext("2d");
  c.font = `${weight} ${fontPx}px ${OPT.fontFamily}`;
  c.textBaseline = "alphabetic";
  if ("letterSpacing" in c) c.letterSpacing = lsp + "px";
  const words = [];
  for (const node of ln.childNodes) {
    const em = node.nodeType === 1 && node.tagName === "EM";
    const col = em ? getComputedStyle(node).color : TEXT_COL;
    node.textContent.split(/(\s+)/).forEach(tok => { if (tok.length) words.push({ t: tok, em, col, sp: /^\s+$/.test(tok) }); });
  }
  const rows = []; let cur = [], curW = 0;
  for (const w of words) {
    const ww = c.measureText(w.t).width;
    if (!w.sp && curW + ww > W && cur.length) { rows.push(cur); cur = []; curW = 0; }
    if (w.sp && !cur.length) continue;
    cur.push(w); curW += ww;
  }
  if (cur.length) rows.push(cur);
  rows.forEach((row, ri) => {
    while (row.length && row[row.length - 1].sp) row.pop();
    let rowW = 0; for (const w of row) rowW += c.measureText(w.t).width;
    let cx = centered ? Math.max(0, (W - rowW) / 2) : 0;
    const cy = fontPx * 0.82 + ri * lh;
    for (const w of row) { c.fillStyle = w.col; c.fillText(w.t, cx, cy); cx += c.measureText(w.t).width; }
  });
  const img = c.getImageData(0, 0, W, H).data;
  const pts = []; const step = finale ? 11 : 6;
  const spineX = innerWidth * 0.5, spineSpread = innerHeight * 0.30;
  for (let py = 0; py < H; py += step) for (let px = 0; px < W; px += step) {
    const i = (py * W + px) * 4;
    if (img[i + 3] > 130) {
      const r = img[i], g = img[i + 1], b = img[i + 2];
      const tx = rect.left + px, ty = rect.top + py;
      let srcIdx = -1;
      if (helixSrc.length) {
        const frac = 1 - clamp(ty / innerHeight, 0, 1);
        const jit = Math.round((Math.random() - 0.5) * helixSrc.length * 0.14);
        srcIdx = clamp(Math.round(frac * (helixSrc.length - 1)) + jit, 0, helixSrc.length - 1);
      }
      if (finale) {
        const acc = Math.abs(r - ACC_RGB[0]) + Math.abs(g - ACC_RGB[1]) + Math.abs(b - ACC_RGB[2]) < 90;
        pts.push({ x: tx, y: ty, srcIdx,
          sx: (spineX + gauss() * 45) - tx, sy: (innerHeight * 0.5 + gauss() * spineSpread) - ty,
          stag: acc ? 0.52 : Math.abs(px / W - 0.5) * 0.7, col: `rgb(${r},${g},${b})` });
      } else {
        const j = step * 0.6;
        pts.push({ x: tx + (Math.random() - 0.5) * j, y: ty + (Math.random() - 0.5) * j, srcIdx,
          sx: (Math.random() - 0.5) * 260, sy: (Math.random() - 0.5) * 180,
          stag: (px / W) * 0.5, col: `rgb(${r},${g},${b})` });
      }
    }
  }
  return pts;
}

function buildTextParticles() {
  const dpr = Math.min(devicePixelRatio, 2);
  txtCanvas.width = innerWidth * dpr; txtCanvas.height = innerHeight * dpr;
  txtCanvas.style.width = innerWidth + "px"; txtCanvas.style.height = innerHeight + "px";
  tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  textLines = [];
  morphSeq = [];
  const colArr = (css) => { const c = new THREE.Color(css); return [c.r, c.g, c.b]; };
  const entry = (els, parts, appear, exit, auto) => {
    const targets = [];
    for (const pr of parts) for (const t of worldTargetsForLine(pr.glyphs, appear + 0.035)) targets.push({ x: t.x, y: t.y, z: t.z, c: pr.col });
    return { els, appear, exit, auto, morph: true, finale: false, targets };
  };
  // per theme: line 1 = setup, lines 2 & 3 = couplet (each keeps its own colour). All reuse ONE pool.
  const grey = colArr(TEXT_COL);
  themes.forEach((th, ti) => {
    const lns = [...th.querySelectorAll(".dna-line")];
    const a1 = parseFloat(lns[0].dataset.appear), a2 = parseFloat(lns[1].dataset.appear);
    const setup = entry([lns[0]], [{ glyphs: coarse(sampleLine(lns[0], false), 240), col: grey }], a1, a1 + 0.09, ti === 0);
    const emCol = lns[2].querySelector("em") ? colArr(getComputedStyle(lns[2].querySelector("em")).color) : grey;
    const couplet = entry([lns[1], lns[2]], [
      { glyphs: coarse(sampleLine(lns[1], false), 130), col: grey },
      { glyphs: coarse(sampleLine(lns[2], false), 130), col: emCol },
    ], a2, a2 + 0.14, false);
    morphSeq.push(setup, couplet);
    textLines.push(setup, couplet);
  });
  // finale keeps its own permanent dots
  const finaleGlyphs = [];
  for (const ln of finaleEl.querySelectorAll(".dna-fline")) {
    for (const pt of sampleLine(ln, true)) finaleGlyphs.push(pt);
    textLines.push({ els: [ln], appear: parseFloat(ln.dataset.appear), exit: 1.1, finale: true, morph: true, group: 4, auto: false });
  }
  recruitPools(finaleGlyphs);
  loadedLineIdx = -1;
}

// evenly thin a point list down to ~n
function coarse(pts, n) {
  if (pts.length <= n) return pts;
  const step = pts.length / n, out = [];
  for (let i = 0; i < pts.length; i += step) out.push(pts[Math.floor(i)]);
  return out;
}

const FINALE_CAMZ = () => P.camDistance + (isMobile() ? 1.5 : 2.05);
// FIXED narrative distance so the 3D letter-dots stay locked to the screen-fixed type
const NARR_CAMZ = () => P.camDistance + 0.5;
const _bakeCam = camera.clone();
const _bv = new THREE.Vector3();
function worldTargetsForLine(glyphs) {
  const camZ = NARR_CAMZ();
  _bakeCam.position.set(0.5, 0, camZ);
  _bakeCam.up.set(0, 1, 0);
  _bakeCam.lookAt((isMobile() ? 0 : P.helixX) * 0.55, 0, 0);
  _bakeCam.aspect = innerWidth / innerHeight;
  _bakeCam.updateProjectionMatrix();
  _bakeCam.updateMatrixWorld();
  const out = [];
  for (const g of glyphs) {
    _bv.set(g.x / innerWidth * 2 - 1, -(g.y / innerHeight * 2 - 1), 0.5).unproject(_bakeCam).sub(_bakeCam.position);
    const tt = -_bakeCam.position.z / _bv.z;
    out.push({ x: _bakeCam.position.x + _bv.x * tt, y: _bakeCam.position.y + _bv.y * tt, z: 0 });
  }
  return out;
}

const SLATE = new THREE.Color(P.dotColorA);
// recruit the shared narrative pool (group 1) + the finale's own dots (group 4)
function recruitPools(finaleGlyphs) {
  if (!geo) return;
  const tgt = geo.getAttribute("aTextTarget"), rec = geo.getAttribute("aRecruit"), acol = geo.getAttribute("aTextColor"), strand = geo.getAttribute("aStrand");
  const N = rec.count;
  for (let i = 0; i < N; i++) rec.setX(i, 0);
  const pool = [];
  for (let i = 0; i < N; i++) if (strand.getX(i) < 2.5) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  narrativePool = pool.slice(0, 280);                 // sized for the couplet (two lines at once)
  for (const vi of narrativePool) rec.setX(vi, 1);
  const wpp = 2 * FINALE_CAMZ() * Math.tan((camera.fov * Math.PI / 180) / 2) / innerHeight;
  let cursor = narrativePool.length;
  const nF = Math.min(finaleGlyphs.length, pool.length - cursor);
  for (let k = 0; k < nF; k++) {
    const vi = pool[cursor++], g = finaleGlyphs[k];
    rec.setX(vi, 4);
    tgt.setXYZ(vi, (g.x - innerWidth / 2) * wpp, -(g.y - innerHeight / 2) * wpp, 0);
    acol.setXYZ(vi, SLATE.r, SLATE.g, SLATE.b);
  }
  rec.needsUpdate = true; tgt.needsUpdate = true; acol.needsUpdate = true;
}

// point the shared pool at an entry's letters (dots cycle if there are more dots than targets)
function loadNarrativeLine(line) {
  if (!geo || !line.targets.length) return;
  const tgt = geo.getAttribute("aTextTarget"), acol = geo.getAttribute("aTextColor");
  const T = line.targets, NT = T.length;
  for (let k = 0; k < narrativePool.length; k++) {
    const vi = narrativePool[k], t = T[k % NT];
    tgt.setXYZ(vi, t.x, t.y, t.z);
    acol.setXYZ(vi, t.c[0], t.c[1], t.c[2]);
  }
  tgt.needsUpdate = true; acol.needsUpdate = true;
}

function updateThemes(p) {
  // ONE "focus" value drives opacity AND blur together, so the type fades in soft-and-blurred and
  // resolves as a single motion (dots + typeface read as one thing pulling into focus)
  for (const L of textLines) {
    const out = L.finale ? 0 : smoothstep(L.exit - 0.03, L.exit, p);
    const focus = (L.finale ? smoothstep(0.955, 0.99, p)
                 : L.auto   ? smoothstep(0.6, 0.95, formProgress)
                 :            smoothstep(L.appear + 0.028, L.appear + 0.05, p)) * (1 - out);
    const opS = focus.toFixed(3);
    const filt = focus > 0.01 ? `blur(${((1 - focus) * (L.finale ? 9 : 6)).toFixed(2)}px)` : "none";
    for (const el of L.els) { el.style.opacity = opS; el.style.filter = filt; }
  }
}

if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildTextParticles);
else buildTextParticles();

/* ------------------------------- resize ----------------------------------- */
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.setSize(window.innerWidth, window.innerHeight);
  uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  helix.position.x = isMobile() ? 0 : P.helixX;
  buildTextParticles();
  readScroll();
}
window.addEventListener("resize", onResize);
onResize();

// project the sampled helix points to screen pixels (live, so text-dots start on the strands)
function projectHelixSrc() {
  helix.updateMatrixWorld();
  camera.updateMatrixWorld();
  const hw = innerWidth, hh = innerHeight;
  for (let i = 0; i < helixSrc.length; i++) {
    _proj.copy(helixSrc[i]).applyMatrix4(helix.matrixWorld).project(camera);
    let s = helixScreen[i]; if (!s) s = helixScreen[i] = { x: 0, y: 0 };
    s.x = (_proj.x * 0.5 + 0.5) * hw;
    s.y = (-_proj.y * 0.5 + 0.5) * hh;
  }
}

/* --------------------------- scene update --------------------------------- */
function updateScene(p, t) {
  uniforms.uRevealA.value = clamp(0.80 + smoothstep(0.0, 0.10, p) * 0.35, 0, 1);
  uniforms.uRevealB.value = smoothstep(0.28, 0.52, p);
  uniforms.uRevealR.value = smoothstep(0.60, 0.82, p);
  const focus = 0;                                    // legacy dot-zoom disabled (steady camera)
  uniforms.uFocus.value = focus;
  uniforms.uTime.value = reduceMotion ? 0 : t;

  // FINALE: the connected helix clicks, settles to a calm backdrop glow; a hero pip on the period
  const fin = smoothstep(0.83, 0.98, p);
  const climb = smoothstep(0.80, 0.85, p);
  const settle = smoothstep(0.86, 0.93, p);
  let connect = lerp(climb, 0.35, settle);
  connect += bump(p, 0.85, 0.012) * 0.7;
  connect += bump(p, 0.975, 0.012) * 0.45;
  uniforms.uConnect.value = connect;

  // MORPH: one shared pool reused line-by-line. Find the entry forming, point the pool at it,
  // drive its rise (pull out of DNA) → hold → fall (return). Auto entry = load-time.
  let mg = 0, mMorph = 0, mFade = 0, mFocus = 0, activeIdx = -1;
  for (let i = 0; i < morphSeq.length; i++) {
    const ml = morphSeq[i];
    if (p >= ml.appear && p <= ml.exit) {
      const a = ml.appear, e = ml.exit;
      const rise = ml.auto ? formProgress : smoothstep(a, a + 0.032, p);
      const fall = 1 - smoothstep(e - 0.032, e, p);
      mMorph = rise * fall;
      const dissolve = ml.auto ? smoothstep(0.5, 0.88, formProgress) : smoothstep(a + 0.025, a + 0.05, p);
      mFade  = dissolve * (1 - smoothstep(e - 0.04, e - 0.012, p));
      mFocus = smoothstep(a - 0.012, a + 0.022, p) * (1 - smoothstep(e - 0.03, e + 0.005, p));
      activeIdx = i; mg = 1;
      break;
    }
  }
  if (mg === 1 && activeIdx !== loadedLineIdx) { loadNarrativeLine(morphSeq[activeIdx]); loadedLineIdx = activeIdx; }
  const lock = smoothstep(0.86, 0.94, p);
  if (p >= 0.86) { mg = 4; mMorph = smoothstep(0.875, 0.955, p); mFade = smoothstep(0.955, 0.99, p); mFocus = 0; }
  uniforms.uActiveGroup.value = mg;
  uniforms.uMorph.value = mMorph;
  uniforms.uMorphFade.value = mFade;

  const recenter = smoothstep(0.80, 0.86, p);
  helix.position.x = (isMobile() ? 0 : P.helixX) * (1 - recenter);
  helix.rotation.z = 0.08 * (1 - lock);
  uniforms.uSize.value = P.dotSize * (1 - smoothstep(0.86, 0.95, p) * 0.28);

  const still = lerp(1, 0.34, smoothstep(0.80, 0.94, p));   // never fully freeze — DNA keeps breathing
  helix.rotation.y = reduceMotion ? 0 : (Math.sin(t * 0.1) * P.sway * still + Math.sin(t * 0.26) * 0.03 * still);
  helix.rotation.x = reduceMotion ? 0 : Math.sin(t * 0.15) * 0.02 * still;

  bloom.strength = P.bloomStrength + smoothstep(0.85, 0.90, p) * 0.20 + bump(p, 0.85, 0.016) * 0.55 + bump(p, 0.975, 0.014) * 0.40;
  bloom.radius = P.bloomRadius + 0.6 * fin;
  scrim.style.opacity = smoothstep(0.875, 0.955, p).toFixed(3);

  // camera distance: FIXED through the narrative, then RECEDE at the finale for the pull-back
  const camZ = lerp(NARR_CAMZ(), FINALE_CAMZ(), smoothstep(0.83, 0.93, p)) - smoothstep(0.97, 1.0, p) * 0.25;
  const par = (1 - 0.85 * fin) * (1 - lock) * (1 - mFocus);
  _defPos.set(0.5 * (1 - lock) + mx * 0.5 * par, (-my * 0.4 + Math.sin(t * 0.2) * 0.15) * par, camZ);
  camera.position.copy(_defPos);
  camera.lookAt(helix.position.x * 0.55, 0, 0);

  render();
  if (helixSrc.length) projectHelixSrc();
  updateThemes(p);
}

/* ------------------------------ render loop ------------------------------- */
let last = performance.now(), introStart = 0;
const INTRO_DUR = 2.2, FORM_DELAY = 0.55, FORM_DUR = 1.5;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  if (!introStart) introStart = now;
  const it = Math.min((now - introStart) / 1000 / INTRO_DUR, 1);
  uniforms.uIntro.value = 1 - Math.pow(1 - it, 3);
  const ft = Math.min(Math.max((now - introStart) / 1000 - FORM_DELAY, 0) / FORM_DUR, 1);
  formProgress = userEngaged ? 1 : 1 - Math.pow(1 - ft, 3);

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (!reduceMotion && maxScroll > 0 && (now - lastInteract) > IDLE_MS && progress < 0.985) {
    autoActiveT += dt;
    const easeIn = smoothstep(0, 1.4, autoActiveT);
    autoAccum += (maxScroll / 62) * dt * easeIn;       // ~1 min across the whole runway at full speed
    if (autoAccum >= 1) { const px = Math.floor(autoAccum); autoAccum -= px; window.scrollBy(0, px); }
  } else { autoAccum = 0; autoActiveT = 0; }

  const k = 1 - Math.pow(0.001, dt);
  progress += (targetP - progress) * Math.min(k * 1.1, 1);
  mx += (tmx - mx) * Math.min(k, 1);
  my += (tmy - my) * Math.min(k, 1);
  updateScene(progress, now * 0.001);
}
requestAnimationFrame(animate);
