/* ============================================================================
   eFellows — scroll-driven DNA (Webflow build)
   Self-contained: injects its own CSS, builds its own canvases + copy.
   Loads via the importmap + <script type="module" src="dna.js"> in the embed.
   Edit COPY / OPT / P below to taste, then re-host this file.
   ============================================================================ */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/* ============================= EDIT ME ==================================== */

// Headline copy. Each theme's lines stack while active, then clear.
// `at` = scroll position (0..1 down the page) where the line starts forming.
// `end` = where the whole theme clears. Wrap accent words in <em>…</em>.
const COPY = [
  { end: 0.44, lines: [
    { at: -0.04, html: "Clients trust us because" },
    { at: 0.09,  html: "we are professional skeptics" },
    { at: 0.17,  html: "<em>and think from first principles</em>" },
  ]},
  { end: 0.88, lines: [
    { at: 0.48, html: "Clients avoid repeated problems because" },
    { at: 0.56, html: "we suffer from chronic curiosity" },
    { at: 0.64, html: "<em>and think from first principles</em>" },
  ]},
  { end: 1.05, lines: [
    { at: 0.82,  html: "Clients hire us to build systems because" },
    { at: 0.855, html: "we are methodical" },
    { at: 0.89,  html: "<em>so we enforce formalism</em>" },
  ]},
];

const OPT = {
  scrollVh:    1700,                            // scroll runway length (vh). Set 0 if your page already scrolls.
  fontFamily:  '"Upton","Oswald",sans-serif',  // resolved type + the font the dots are sampled from
  fontUrl:     "",                             // URL to Upton.woff2 (leave "" to fall back to Oswald)
  fontSizePx:  64,                             // desktop headline size
  textColor:   "#C8D1D6",
  accent:      "#7fd4e6",
};

// DNA look — paste the "⧉ Copy settings" JSON from the tuning panel here.
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
html{ overflow-x:clip; }
#dna-gl,#dna-txt{ position:fixed; inset:0; width:100vw; height:100vh; display:block; pointer-events:none; }
#dna-gl{ z-index:0; } #dna-txt{ z-index:5; }
.dna-vignette{ position:fixed; inset:0; z-index:2; pointer-events:none;
  background:radial-gradient(120% 120% at 65% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,.55) 100%); mix-blend-mode:multiply; }
.dna-grain{ position:fixed; inset:-50%; z-index:3; pointer-events:none; opacity:.05; background-image:url("${GRAIN}"); }
.dna-overlay{ position:fixed; inset:0; z-index:4; pointer-events:none; }
.dna-theme{ position:fixed; top:50%; left:clamp(24px,7vw,150px); max-width:min(48vw,760px); transform:translateY(-50%); }
.dna-line{ font-family:${OPT.fontFamily}; font-weight:500; font-size:${OPT.fontSizePx}px; line-height:1.05;
  letter-spacing:-0.01em; color:${OPT.textColor}; text-shadow:0 2px 40px rgba(4,8,14,.6); margin:0 0 .1em;
  opacity:0; will-change:transform,opacity; }
.dna-line em{ font-style:normal; color:${OPT.accent}; }
.dna-scrollspace{ height:${OPT.scrollVh}vh; position:relative; z-index:1; pointer-events:none; }
@media (max-width:760px){
  .dna-theme{ left:20px; right:20px; max-width:none; top:50%; bottom:auto; transform:translateY(-50%); text-align:center; }
  .dna-line{ font-size:clamp(44px,13vw,80px); }
}`;
document.head.appendChild(style);

const glCanvas = Object.assign(document.createElement("canvas"), { id: "dna-gl" });
const txtCanvas = Object.assign(document.createElement("canvas"), { id: "dna-txt" });
const vignette = Object.assign(document.createElement("div"), { className: "dna-vignette" });
const grain = Object.assign(document.createElement("div"), { className: "dna-grain" });
const overlay = Object.assign(document.createElement("div"), { className: "dna-overlay" });
document.body.append(glCanvas, vignette, grain, txtCanvas, overlay);

COPY.forEach((theme) => {
  const th = document.createElement("div");
  th.className = "dna-theme"; th.dataset.end = theme.end;
  theme.lines.forEach((l) => {
    const p = document.createElement("p");
    p.className = "dna-line"; p.dataset.appear = l.at; p.innerHTML = l.html;
    th.appendChild(p);
  });
  overlay.appendChild(th);
});
if (OPT.scrollVh > 0) {
  document.body.appendChild(Object.assign(document.createElement("div"), { className: "dna-scrollspace" }));
}

/* ---------------------------- math helpers -------------------------------- */
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp  = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const bump  = (x, c, w) => { const d = (x - c) / w; return Math.exp(-(d * d)); };
const gauss = () => { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* --------------------- renderer / scene / camera -------------------------- */
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true });
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
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), P.bloomStrength, P.bloomRadius, P.bloomThreshold);
composer.addPass(bloom);
const render = () => composer.render();

/* --------------------------- DNA geometry --------------------------------- */
const PHASE_B = Math.PI;
const hlLocal = new THREE.Vector3();
const _defPos = new THREE.Vector3(), _nearPos = new THREE.Vector3(), _hlWorld = new THREE.Vector3(), _tgt = new THREE.Vector3();

let geo = null, dna = null;
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

  const g = new THREE.BufferGeometry();
  g.setAttribute("position",   new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("aBirth",     new THREE.Float32BufferAttribute(births, 1));
  g.setAttribute("aStrand",    new THREE.Float32BufferAttribute(strands, 1));
  g.setAttribute("aSize",      new THREE.Float32BufferAttribute(sizes, 1));
  g.setAttribute("aSeed",      new THREE.Float32BufferAttribute(seeds, 1));
  g.setAttribute("aHighlight", new THREE.Float32BufferAttribute(highlights, 1));
  g.setAttribute("aRungDir",   new THREE.Float32BufferAttribute(rdirs, 3));
  if (geo) geo.dispose();
  geo = g;
  if (dna) dna.geometry = g;
}
buildDNA();

const uniforms = {
  uTime: { value: 0 }, uRevealA: { value: 0 }, uRevealB: { value: 0 }, uRevealR: { value: 0 },
  uFocus: { value: 0 }, uSize: { value: P.dotSize }, uConnect: { value: 0 }, uIntro: { value: 0 },
  uRungBoost: { value: P.rungBoost }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  uColorA: { value: new THREE.Color(P.dotColorA) }, uColorB: { value: new THREE.Color(P.dotColorB) },
  uColorHi: { value: new THREE.Color(0xd2dadf) },
};

const material = new THREE.ShaderMaterial({
  uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    attribute float aBirth; attribute float aStrand; attribute float aSize; attribute float aSeed; attribute float aHighlight; attribute vec3 aRungDir;
    uniform float uTime, uRevealA, uRevealB, uRevealR, uFocus, uSize, uPixelRatio, uConnect, uRungBoost, uIntro;
    varying float vAlpha; varying float vGlow; varying float vStrand;
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
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
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
        vAlpha *= mix(1.0, 0.08, smoothstep(0.5, 0.88, abs(normalize(vd).z)));
      }
    }`,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform vec3 uColorA, uColorB, uColorHi;
    varying float vAlpha; varying float vGlow; varying float vStrand;
    void main(){
      vec2 uv = gl_PointCoord - 0.5; float d = length(uv);
      float core = smoothstep(0.5, 0.06, d); float halo = smoothstep(0.5, 0.2, d);
      vec3 col = mix(uColorA, uColorB, clamp(vStrand, 0.0, 1.0));
      col = mix(col, uColorHi, vGlow);
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
function readScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  targetP = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
}
window.addEventListener("scroll", readScroll, { passive: true });
readScroll();
window.addEventListener("pointermove", (e) => { tmx = (e.clientX / window.innerWidth) * 2 - 1; tmy = (e.clientY / window.innerHeight) * 2 - 1; });

const themes = [...overlay.querySelectorAll(".dna-theme")];
const isMobile = () => window.innerWidth <= 760;

/* --------------- headline: dots form → resolve into typeface --------------- */
const tctx = txtCanvas.getContext("2d");
const TEXT_COL = OPT.textColor, ACCENT_COL = OPT.accent;
let textLines = [];

function sampleLine(ln) {
  const rect = ln.getBoundingClientRect();
  const W = Math.max(2, Math.ceil(rect.width)), H = Math.max(2, Math.ceil(rect.height) + 6);
  const fontPx = isMobile() ? Math.min(80, Math.max(44, innerWidth * 0.13)) : OPT.fontSizePx;
  const lh = fontPx * 1.05;
  const oc = document.createElement("canvas"); oc.width = W; oc.height = H;
  const c = oc.getContext("2d");
  c.font = `500 ${fontPx}px ${OPT.fontFamily}`;
  c.textBaseline = "alphabetic";
  if ("letterSpacing" in c) c.letterSpacing = (-0.01 * fontPx) + "px";
  const words = [];
  for (const node of ln.childNodes) {
    const em = node.nodeType === 1 && node.tagName === "EM";
    node.textContent.split(/(\s+)/).forEach(tok => { if (tok.length) words.push({ t: tok, em, sp: /^\s+$/.test(tok) }); });
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
    while (row.length && row[row.length - 1].sp) row.pop();   // trim trailing space
    let rowW = 0; for (const w of row) rowW += c.measureText(w.t).width;
    let cx = isMobile() ? Math.max(0, (W - rowW) / 2) : 0;    // centered on mobile
    const cy = fontPx * 0.82 + ri * lh;
    for (const w of row) { c.fillStyle = w.em ? ACCENT_COL : TEXT_COL; c.fillText(w.t, cx, cy); cx += c.measureText(w.t).width; }
  });
  const img = c.getImageData(0, 0, W, H).data;
  const pts = []; const step = 6;
  for (let py = 0; py < H; py += step) for (let px = 0; px < W; px += step) {
    const i = (py * W + px) * 4;
    if (img[i + 3] > 130) {
      const j = step * 0.6;
      pts.push({
        x: rect.left + px + (Math.random() - 0.5) * j, y: rect.top + py + (Math.random() - 0.5) * j,
        sx: (Math.random() - 0.5) * 260, sy: (Math.random() - 0.5) * 180,
        stag: (px / W) * 0.5, col: `rgb(${img[i]},${img[i + 1]},${img[i + 2]})`,
      });
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
  for (const th of themes) {
    const end = parseFloat(th.dataset.end);
    for (const ln of th.querySelectorAll(".dna-line")) {
      textLines.push({ el: ln, appear: parseFloat(ln.dataset.appear), end, pts: sampleLine(ln) });
    }
  }
}

function updateThemes(p) {
  const gi = uniforms.uIntro.value;
  tctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const L of textLines) {
    const inn = smoothstep(L.appear, L.appear + 0.10, p);
    const out = smoothstep(L.end - 0.06, L.end, p);
    const vis = 1 - out, drift = -out * 55;
    const resolve = smoothstep(0.72, 0.99, inn);
    const dotFade = 1 - smoothstep(0.80, 1.0, inn);
    L.el.style.opacity = (resolve * vis * gi).toFixed(3);
    L.el.style.transform = `translateY(${drift}px)`;
    if (inn <= 0.001 || vis <= 0.001 || dotFade <= 0.001) continue;
    for (let i = 0; i < L.pts.length; i++) {
      const pt = L.pts[i];
      const cr = smoothstep(pt.stag, pt.stag + 0.42, inn) * gi;
      if (cr <= 0.02) continue;
      const k = 1 - cr;
      tctx.globalAlpha = cr * vis * dotFade;
      tctx.fillStyle = pt.col;
      tctx.beginPath();
      tctx.arc(pt.x + pt.sx * k, pt.y + pt.sy * k + drift, 2.0, 0, 6.2832);
      tctx.fill();
    }
  }
  tctx.globalAlpha = 1;
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

/* --------------------------- scene update --------------------------------- */
function updateScene(p, t) {
  uniforms.uRevealA.value = clamp(0.80 + smoothstep(0.0, 0.10, p) * 0.35, 0, 1);
  uniforms.uRevealB.value = smoothstep(0.48, 0.70, p);
  uniforms.uRevealR.value = smoothstep(0.82, 0.96, p);
  const focus = bump(p, 0.31, 0.045);
  uniforms.uFocus.value = focus;
  uniforms.uTime.value = reduceMotion ? 0 : t;
  const connect = smoothstep(0.88, 0.98, p);
  uniforms.uConnect.value = connect + bump(p, 0.955, 0.02) * 0.9;
  helix.rotation.y = Math.sin(t * 0.1) * P.sway;
  helix.rotation.x = Math.sin(t * 0.15) * 0.02;
  const dolly = smoothstep(0, 1, p);
  _defPos.set(0.5 + mx * 0.5, -my * 0.4 + Math.sin(t * 0.2) * 0.15, lerp(P.camDistance + 1.0, P.camDistance, dolly));
  if (focus > 0.001) {
    helix.updateMatrixWorld();
    _hlWorld.copy(hlLocal).applyMatrix4(helix.matrixWorld);
    _nearPos.set(_hlWorld.x * 0.6, _hlWorld.y * 0.8, _hlWorld.z + 4.6);
    camera.position.copy(_defPos).lerp(_nearPos, focus * 0.9);
    _tgt.set(helix.position.x * 0.55, 0, 0).lerp(_hlWorld, focus * 0.85);
    camera.lookAt(_tgt);
  } else {
    camera.position.copy(_defPos);
    camera.lookAt(helix.position.x * 0.55, 0, 0);
  }
  render();
  updateThemes(p);
}

/* ------------------------------ render loop ------------------------------- */
let last = performance.now(), introStart = 0;
const INTRO_DUR = 2.2;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  if (!introStart) introStart = now;
  const it = Math.min((now - introStart) / 1000 / INTRO_DUR, 1);
  uniforms.uIntro.value = 1 - Math.pow(1 - it, 3);
  const k = 1 - Math.pow(0.001, dt);
  progress += (targetP - progress) * Math.min(k * 1.1, 1);
  mx += (tmx - mx) * Math.min(k, 1);
  my += (tmy - my) * Math.min(k, 1);
  updateScene(progress, now * 0.001);
}
requestAnimationFrame(animate);
