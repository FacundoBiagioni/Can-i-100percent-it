"use client";

import { useEffect, useRef, useState } from "react";
import { IBM_Plex_Mono } from "next/font/google";

// Only the canvas uses this face (the glyphs are imagery, not UI type), so
// it's loaded here rather than in the root layout.
const plexMono = IBM_Plex_Mono({ weight: "600", subsets: ["latin"], display: "block" });

/*
 * Live port of the "Fondo Hero 100%" design (v2): 3D shapes (torus ->
 * sphere -> rhombus -> knot -> torus) built from "100%" glyphs in ember orange, lit by a
 * moving light, a scanline and an orbiting glow. Drawn on a 2D canvas every
 * frame at the device's native resolution, so it's sharper than any video
 * export and weighs a few KB instead of megabytes.
 *
 * All drawing happens in the design's own 1920x1080 space; a cover transform
 * maps that onto whatever box the canvas has, like object-fit: cover.
 */

const W = 1920;
const H = 1080;
const TAU = Math.PI * 2;
const RGB = "255,77,0";
const ORANGE = `rgb(${RGB})`;
const GLYPHS = "100%";

// Design settings as authored.
const DENSITY = 1100;
const GLOW = 1;
const SIZE = 1.25;
const TURNS = 1;

// Scene starts (s): Toro 0, Esfera 6.5, Rombo 13, Nudo 19.5; loop is 27.5s.
const CUE_SPHERE = 6.5;
const CUE_RHOMBUS = 13;
const CUE_KNOT = 19.5;
const TOTAL = 27.5;
// Index of the rhombus in buildShapes' output; its faces stay flat, so the
// per-glyph surface ripple is faded out on it.
const RHOMBUS = 2;
// Frame shown, frozen, under prefers-reduced-motion (the settled torus).
const STILL_T = 2.5;

// Sprites are baked larger than they're ever drawn so glyphs stay crisp
// even on 4K/high-DPI screens, where the cover transform scales them up
// (the nearest glyphs reach ~95 device px at 3840x2160).
const SPRITE = 192;
const SPRITE_FONT = 128;

type Vec3 = [number, number, number];
type Sprites = {
  crisp: Record<string, HTMLCanvasElement>;
  halo: Record<string, HTMLCanvasElement>;
  bloom: HTMLCanvasElement;
};
type Dust = { x: number; y: number; k: number; s: number; a: number; ch: string; dir: number };
type Scene = {
  shapes: Float32Array[];
  seeds: Float32Array;
  dust: Dust[];
  sprites: Sprites;
  sx: Float32Array;
  sy: Float32Array;
  sz: Float32Array;
  b: Float32Array;
  d: Float32Array;
};

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);
const swirl = (p: number) => Math.sin(Math.PI * p);
const wave = (u: number, k: number, ph: number) => Math.sin(TAU * u * k + ph);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Wraps `count` points around a tube following `curve`; each point stores
 * position + outward normal (6 floats). */
function tube(
  out: Float32Array,
  start: number,
  count: number,
  curve: (s: number) => Vec3,
  rho: number,
  gap: number,
  ref: Vec3,
  phase: number,
) {
  let L = 0;
  let prev = curve(0);
  for (let k = 1; k <= 400; k++) {
    const c = curve(k / 400);
    L += Math.hypot(c[0] - prev[0], c[1] - prev[1], c[2] - prev[2]);
    prev = c;
  }
  const wind = Math.max(1, Math.round(L / gap));
  for (let j = 0; j < count; j++) {
    const s = j / count;
    const c = curve(s);
    const c2 = curve(s + 1e-3);
    const t = norm([c2[0] - c[0], c2[1] - c[1], c2[2] - c[2]]);
    const n = norm(cross(t, ref));
    const b = cross(t, n);
    const ps = TAU * s * wind + phase;
    const cs = Math.cos(ps);
    const sn = Math.sin(ps);
    const o: Vec3 = [cs * n[0] + sn * b[0], cs * n[1] + sn * b[1], cs * n[2] + sn * b[2]];
    const i = (start + j) * 6;
    out[i] = c[0] + rho * o[0];
    out[i + 1] = c[1] + rho * o[1];
    out[i + 2] = c[2] + rho * o[2];
    out[i + 3] = o[0];
    out[i + 4] = o[1];
    out[i + 5] = o[2];
  }
}

function buildShapes(N: number): Float32Array[] {
  const Y: Vec3 = [0, 1, 0];
  const torus = new Float32Array(N * 6);
  tube(torus, 0, N, (s) => [290 * Math.cos(TAU * s), 0, 290 * Math.sin(TAU * s)], 108, 50, Y, 0);

  const sphere = new Float32Array(N * 6);
  const R = 310;
  const ws = Math.max(6, Math.round(N / 95));
  for (let i = 0; i < N; i++) {
    const s = (i + 0.5) / N;
    const y = 1 - 2 * s;
    const r = Math.sqrt(1 - y * y);
    const a = TAU * s * ws;
    const nx = r * Math.cos(a);
    const nz = r * Math.sin(a);
    const k = i * 6;
    sphere[k] = nx * R;
    sphere[k + 1] = y * R;
    sphere[k + 2] = nz * R;
    sphere[k + 3] = nx;
    sphere[k + 4] = y;
    sphere[k + 5] = nz;
  }

  // Rhombus: an elongated regular octahedron — rows of glyphs on its 8
  // faces plus crisp edges.
  const rhomb = new Float32Array(N * 6);
  const RW = 290;
  const RH = 430;
  const eq: Vec3[] = [
    [RW, 0, 0],
    [0, 0, RW],
    [-RW, 0, 0],
    [0, 0, -RW],
  ];
  const ap: Vec3[] = [
    [0, RH, 0],
    [0, -RH, 0],
  ];
  const faceN = Math.floor((N * 0.82) / 8);
  const m = Math.max(2, Math.floor((Math.sqrt(1 + 8 * faceN) - 1) / 2));
  const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  let idx = 0;
  const put = (p: Vec3, n: Vec3) => {
    if (idx >= N) return;
    const k = idx * 6;
    rhomb[k] = p[0];
    rhomb[k + 1] = p[1];
    rhomb[k + 2] = p[2];
    rhomb[k + 3] = n[0];
    rhomb[k + 4] = n[1];
    rhomb[k + 5] = n[2];
    idx++;
  };
  for (let ai = 0; ai < 2; ai++) {
    for (let e = 0; e < 4; e++) {
      const b1 = eq[e];
      const b2 = eq[(e + 1) % 4];
      const A = ap[ai];
      const n = norm([Math.sign(b1[0] + b2[0]) / RW, Math.sign(A[1]) / RH, Math.sign(b1[2] + b2[2]) / RW]);
      for (let r = 0; r < m; r++) {
        const t = (r + 0.5) / (m + 0.5);
        const c = m - r;
        const L0 = lerp3(b1, A, t);
        const L1 = lerp3(b2, A, t);
        for (let q = 0; q < c; q++) put(lerp3(L0, L1, (q + 0.5) / c), n);
      }
    }
  }
  const edges: [Vec3, Vec3][] = [];
  for (let e = 0; e < 4; e++) {
    edges.push([eq[e], eq[(e + 1) % 4]]);
    edges.push([ap[0], eq[e]]);
    edges.push([ap[1], eq[e]]);
  }
  const rest = N - idx;
  for (let k = 0; k < rest; k++) {
    const ed = edges[k % 12];
    const t = (Math.floor(k / 12) + 0.5) / Math.ceil(rest / 12);
    const p = lerp3(ed[0], ed[1], t);
    put(p, norm([p[0] / RW, p[1] / RH, p[2] / RW]));
  }

  const knot = new Float32Array(N * 6);
  tube(
    knot,
    0,
    N,
    (s) => {
      const f = TAU * s;
      const r = (Math.cos(3 * f) + 2) * 104;
      return [r * Math.cos(2 * f), -Math.sin(3 * f) * 104, r * Math.sin(2 * f)];
    },
    44,
    42,
    Y,
    0,
  );

  return [torus, sphere, rhomb, knot];
}

function makeSprites(fontFamily: string): Sprites {
  const mk = (ch: string, size: number, blur: number, crisp: boolean) => {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const x = c.getContext("2d")!;
    x.font = `600 ${SPRITE_FONT}px ${fontFamily}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillStyle = ORANGE;
    if (!crisp) {
      x.shadowColor = ORANGE;
      x.shadowBlur = blur;
      x.globalAlpha = 0.85;
      x.fillText(ch, size / 2, size / 2);
      x.fillText(ch, size / 2, size / 2);
    } else {
      x.fillText(ch, size / 2, size / 2 + (2 * SPRITE) / 96);
    }
    return c;
  };
  const crisp: Record<string, HTMLCanvasElement> = {};
  const halo: Record<string, HTMLCanvasElement> = {};
  for (const ch of new Set(GLYPHS)) {
    crisp[ch] = mk(ch, SPRITE, 0, true);
    halo[ch] = mk(ch, SPRITE * 2, (30 * SPRITE) / 96, false);
  }
  const bloom = document.createElement("canvas");
  bloom.width = bloom.height = 512;
  const b = bloom.getContext("2d")!;
  const g = b.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, `rgba(${RGB},0.55)`);
  g.addColorStop(0.35, `rgba(${RGB},0.16)`);
  g.addColorStop(1, `rgba(${RGB},0)`);
  b.fillStyle = g;
  b.fillRect(0, 0, 512, 512);
  return { crisp, halo, bloom };
}

function buildScene(fontFamily: string): Scene {
  const N = DENSITY;
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) seeds[i] = hash(i);
  const dust = Array.from({ length: 140 }, (_, i) => ({
    x: hash(i + 900) * W,
    y: hash(i + 1900) * H,
    k: 1 + Math.floor(hash(i + 2900) * 2),
    s: 9 + hash(i + 3900) * 10,
    a: 0.05 + hash(i + 4900) * 0.12,
    ch: GLYPHS[i % 4],
    dir: hash(i + 5900) < 0.5 ? -1 : 1,
  }));
  return {
    shapes: buildShapes(N),
    seeds,
    dust,
    sprites: makeSprites(fontFamily),
    sx: new Float32Array(N),
    sy: new Float32Array(N),
    sz: new Float32Array(N),
    b: new Float32Array(N),
    d: new Float32Array(N),
  };
}

const MORPHS = [
  { a: 0, b: 1, start: CUE_SPHERE - 1.0 },
  { a: 1, b: 2, start: CUE_RHOMBUS - 1.0 },
  { a: 2, b: 3, start: CUE_KNOT - 1.0 },
  { a: 3, b: 0, start: TOTAL - 2.7 },
];

/** Draws the frame at time T (seconds into the 21s loop), in 1920x1080 space. */
function drawFrame(ctx: CanvasRenderingContext2D, scene: Scene, T: number) {
  const N = DENSITY;
  const { shapes, seeds, dust, sprites, sx, sy, sz, b: bright, d: diam } = scene;
  const u = (((T / TOTAL) % 1) + 1) % 1;

  let A = shapes[0];
  let B = shapes[0];
  let mStart = -1e9;
  for (const m of MORPHS) {
    if (T >= m.start) {
      A = shapes[m.a];
      B = shapes[m.b];
      mStart = m.start;
    }
  }

  // Periodic rotation (seamless loop).
  const ay = TAU * TURNS * u;
  const ax = -0.45 + 0.16 * wave(u, 1, 0);
  const az = 0.14 * wave(u, 2, 0.6);
  const cyR = Math.cos(ay), syR = Math.sin(ay), cxR = Math.cos(ax), sxR = Math.sin(ax), czR = Math.cos(az), szR = Math.sin(az);
  const rot = (x: number, y: number, z: number, o: Vec3) => {
    const x1 = x * cyR + z * syR;
    const z1 = -x * syR + z * cyR;
    const y2 = y * cxR - z1 * sxR;
    const z2 = y * sxR + z1 * cxR;
    o[0] = x1 * czR - y2 * szR;
    o[1] = x1 * szR + y2 * czR;
    o[2] = z2;
  };

  const la = TAU * u;
  const L = norm([Math.cos(la) * 0.9, -0.6 + 0.25 * Math.sin(la * 2), -0.75]);
  const Hh = norm([L[0], L[1], L[2] - 1]);
  const scanY = 430 * wave(u, 3, 0);
  const ol: Vec3 = [Math.cos(TAU * 2 * u) * 430, Math.sin(TAU * u) * 160, Math.sin(TAU * 2 * u) * 430];
  const flick = Math.floor(T * 9);
  const breathe = 1 + 0.025 * wave(u, 2, 0);
  const S = SIZE * breathe;
  const D = 1700;
  const cx = W / 2;
  const cy = H / 2;

  const p3: Vec3 = [0, 0, 0];
  const n3: Vec3 = [0, 0, 0];
  for (let i = 0; i < N; i++) {
    const k = i * 6;
    const sd = seeds[i];
    let p = 1;
    if (A !== B) p = easeInOutCubic(clamp((T - mStart - sd * 0.7) / 2.0, 0, 1));
    const q = 1 - p;
    const rhombW = (A === shapes[RHOMBUS] ? q : 0) + (B === shapes[RHOMBUS] ? p : 0);
    let nx = A[k + 3] * q + B[k + 3] * p;
    let ny = A[k + 4] * q + B[k + 4] * p;
    let nz = A[k + 5] * q + B[k + 5] * p;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const push = (A !== B ? swirl(p) * (40 + 90 * sd) : 0) + 7 * wave(u, 8, i * 0.11) * (1 - rhombW);
    rot(A[k] * q + B[k] * p + nx * push, A[k + 1] * q + B[k + 1] * p + ny * push, A[k + 2] * q + B[k + 2] * p + nz * push, p3);
    rot(nx, ny, nz, n3);

    const diff = Math.max(0, n3[0] * L[0] + n3[1] * L[1] + n3[2] * L[2]);
    const sp = Math.max(0, n3[0] * Hh[0] + n3[1] * Hh[1] + n3[2] * Hh[2]);
    const spec = sp * sp * sp * sp;
    const spec2 = spec * spec * spec;
    const depth = clamp((p3[2] + 420) / 840, 0, 1);
    const df = 1 - 0.62 * depth;
    const dy = (p3[1] - scanY) / 46;
    const scan = Math.exp(-dy * dy) * 0.75;
    const ddx = p3[0] - ol[0], ddy = p3[1] - ol[1], ddz = p3[2] - ol[2];
    const orb = Math.exp(-(ddx * ddx + ddy * ddy + ddz * ddz) / 39200) * 0.95;
    let br = (0.16 + 0.68 * diff + 0.95 * spec2) * df + scan * df + orb;
    if (n3[2] > 0) br *= 0.7;
    if (hash(i * 7.13 + flick) > 0.988) br = 1.15;

    const f = D / (D + p3[2]);
    sx[i] = cx + p3[0] * f * S;
    sy[i] = cy + p3[1] * f * S;
    sz[i] = p3[2];
    diam[i] = 17 * f * S;
    bright[i] = br;
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Breathing central halo.
  const bl = 1150 * SIZE * (1 + 0.06 * wave(u, 2, 1.2));
  ctx.globalAlpha = clamp((0.42 + 0.12 * wave(u, 4, 0)) * GLOW, 0, 1);
  ctx.drawImage(sprites.bloom, cx - bl / 2, cy - bl / 2, bl, bl);

  // Background glyph dust, periodic drift.
  for (const dd of dust) {
    const x = (((dd.x + dd.dir * u * dd.k * W) % W) + W) % W;
    const y = dd.y + 14 * wave(u, dd.k, dd.x);
    ctx.globalAlpha = dd.a;
    ctx.drawImage(sprites.crisp[dd.ch], x - dd.s / 2, y - dd.s / 2, dd.s, dd.s);
  }

  const crisp = sprites.crisp;
  const halo = sprites.halo;
  const drawPass = (far: boolean) => {
    for (let i = 0; i < N; i++) {
      if (sz[i] > 0 !== far) continue;
      const a = bright[i];
      if (a < 0.03) continue;
      const s = diam[i] * 1.6;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(crisp[GLYPHS[i & 3]], sx[i] - s / 2, sy[i] - s / 2, s, s);
    }
  };
  drawPass(true);
  if (GLOW > 0) {
    for (let i = 0; i < N; i++) {
      const a = bright[i];
      if (a < 0.5) continue;
      const s = diam[i] * 3.2;
      ctx.globalAlpha = clamp((a - 0.5) * 0.85 * GLOW, 0, 1);
      ctx.drawImage(halo[GLYPHS[i & 3]], sx[i] - s / 2, sy[i] - s / 2, s, s);
    }
  }
  drawPass(false);

  // Orbiting light.
  const fo = D / (D + ol[2]);
  const ox = cx + ol[0] * fo * SIZE;
  const oy = cy + ol[1] * fo * SIZE;
  const os = 260 * fo * SIZE;
  ctx.globalAlpha = clamp((ol[2] < 0 ? 0.55 : 0.25) * GLOW, 0, 1);
  ctx.drawImage(sprites.bloom, ox - os / 2, oy - os / 2, os, os);
  ctx.globalAlpha = 1;
}

/**
 * Full-bleed animated background for the homepage hero. Fades in after the
 * first frame is drawn, pauses while scrolled out of view or in a hidden
 * tab, and holds a single still frame under prefers-reduced-motion.
 */
export default function HeroAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let disposed = false;
    let scene: Scene | null = null;
    let raf = 0;
    let visible = true;
    // Animation clock that only advances while actually playing, so it
    // resumes where it left off instead of jumping after a pause.
    let clock = 0;
    let lastNow: number | null = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    function fit() {
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const cw = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
      const k = Math.max(cw / W, ch / H);
      ctx.setTransform(k, 0, 0, k, (cw - W * k) / 2, (ch - H * k) / 2);
      ctx.imageSmoothingQuality = "high";
    }

    function render() {
      if (!scene || !ctx) return;
      drawFrame(ctx, scene, reduce.matches ? STILL_T : clock % TOTAL);
    }

    function tick(now: number) {
      raf = 0;
      if (disposed || !visible || reduce.matches) return;
      if (lastNow !== null) clock += Math.min(now - lastNow, 100) / 1000;
      lastNow = now;
      render();
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (raf || disposed || !scene || !visible || reduce.matches) return;
      lastNow = null;
      raf = requestAnimationFrame(tick);
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function onMotionChange() {
      stop();
      render();
      start();
    }

    const resize = new ResizeObserver(() => {
      fit();
      render();
    });
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });

    // Glyph sprites need the real font, not the fallback, so the scene is
    // built only once it has loaded (display: block, so this is quick).
    const family = plexMono.style.fontFamily;
    document.fonts
      .load(`600 ${SPRITE_FONT}px ${family}`)
      .catch(() => {})
      .then(() => {
        if (disposed) return;
        scene = buildScene(family);
        fit();
        render();
        setReady(true);
        resize.observe(canvas);
        io.observe(canvas);
        reduce.addEventListener("change", onMotionChange);
        start();
      });

    return () => {
      disposed = true;
      stop();
      resize.disconnect();
      io.disconnect();
      reduce.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-void">
      <canvas
        ref={canvasRef}
        className={`block h-full w-full transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
      />
      {/* Flat scrim, no gradient: keeps the white type legible over any frame. */}
      <div className="absolute inset-0 bg-void/55" />
    </div>
  );
}
