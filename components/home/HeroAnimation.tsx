"use client";

import { useEffect, useRef, useState } from "react";
import { plexMono } from "@/lib/ui/fonts";
import { MOTION_EVENT, motionReduced } from "@/lib/preferences/config";

// Only the homepage canvases use this face (the glyphs are imagery, not UI
// type), so it isn't loaded in the root layout.

/*
 * Live port of the "Fondo Hero 100%" design (v2): 3D shapes (torus ->
 * sphere -> rhombus -> knot -> torus) built from "100%" glyphs in ember orange, lit by a
 * moving light, a scanline and an orbiting glow. Drawn every frame at the
 * device's native resolution, so it's sharper than any video export and
 * weighs a few KB instead of megabytes.
 *
 * Each frame is reduced to one ordered list of textured squares (bloom,
 * dust, far glyphs, halos, near glyphs, orbit light) sampled from a single
 * sprite atlas. WebGL2 draws that whole list in ONE instanced draw call; the
 * earlier Canvas 2D version issued ~2,500 drawImage calls per frame, which
 * is what dropped frames on integrated GPUs and high-DPI screens. Canvas 2D
 * remains only as a fallback, drawing the same list from the same atlas.
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
/** Square sprite cell in the atlas: x, y, size (atlas px). */
type Cell = [number, number, number];
type Atlas = {
  canvas: HTMLCanvasElement;
  crisp: Record<string, Cell>;
  halo: Record<string, Cell>;
  bloom: Cell;
};
type Dust = { x: number; y: number; k: number; s: number; a: number; ch: string; dir: number };
type Scene = {
  shapes: Float32Array[];
  seeds: Float32Array;
  dust: Dust[];
  atlas: Atlas;
  /** Per-frame draw list, FLOATS_PER_INSTANCE floats per sprite. */
  inst: Float32Array;
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

// Atlas layout: generous transparent padding between cells so mipmapped
// sampling of one sprite never bleeds into its neighbour.
const ATLAS = 2048;
const HALO = SPRITE * 2;
const BLOOM = 512;

function makeAtlas(fontFamily: string): Atlas {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = ATLAS;
  const x = canvas.getContext("2d")!;
  const chars = [...new Set(GLYPHS)];

  const glyph = (ch: string, cell: Cell, blur: number, crisp: boolean) => {
    const [cx, cy, size] = cell;
    x.save();
    x.beginPath();
    x.rect(cx, cy, size, size);
    x.clip();
    x.font = `600 ${SPRITE_FONT}px ${fontFamily}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillStyle = ORANGE;
    if (!crisp) {
      x.shadowColor = ORANGE;
      x.shadowBlur = blur;
      x.globalAlpha = 0.85;
      x.fillText(ch, cx + size / 2, cy + size / 2);
      x.fillText(ch, cx + size / 2, cy + size / 2);
    } else {
      x.fillText(ch, cx + size / 2, cy + size / 2 + (2 * SPRITE) / 96);
    }
    x.restore();
  };

  const crisp: Record<string, Cell> = {};
  const halo: Record<string, Cell> = {};
  chars.forEach((ch, i) => {
    crisp[ch] = [64 + i * (SPRITE + 128), 64, SPRITE];
    halo[ch] = [64 + i * (HALO + 128), 64 + SPRITE + 128, HALO];
    glyph(ch, crisp[ch], 0, true);
    glyph(ch, halo[ch], (30 * SPRITE) / 96, false);
  });

  const bloom: Cell = [64, 64 + SPRITE + 128 + HALO + 128, BLOOM];
  const half = BLOOM / 2;
  const g = x.createRadialGradient(bloom[0] + half, bloom[1] + half, 0, bloom[0] + half, bloom[1] + half, half);
  g.addColorStop(0, `rgba(${RGB},0.55)`);
  g.addColorStop(0.35, `rgba(${RGB},0.16)`);
  g.addColorStop(1, `rgba(${RGB},0)`);
  x.fillStyle = g;
  x.fillRect(bloom[0], bloom[1], BLOOM, BLOOM);

  return { canvas, crisp, halo, bloom };
}

// Instance layout: center x, center y, size (design px), alpha, then the
// atlas cell x, y, size, plus one pad float to keep the stride at 32 bytes.
const FLOATS_PER_INSTANCE = 8;
const DUST_COUNT = 140;
const MAX_INSTANCES = 2 + DUST_COUNT + DENSITY * 3;

function buildScene(fontFamily: string): Scene {
  const N = DENSITY;
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) seeds[i] = hash(i);
  const dust = Array.from({ length: DUST_COUNT }, (_, i) => ({
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
    atlas: makeAtlas(fontFamily),
    inst: new Float32Array(MAX_INSTANCES * FLOATS_PER_INSTANCE),
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

/**
 * Computes the frame at time T (seconds into the loop) and writes it into
 * scene.inst as an ordered draw list, back to front. Returns the number of
 * sprites. The order is exactly the original painter's order, so drawing
 * the list with source-over blending reproduces the design pixel for pixel.
 */
function buildFrame(scene: Scene, T: number): number {
  const N = DENSITY;
  const { shapes, seeds, dust, atlas, inst, sx, sy, sz, b: bright, d: diam } = scene;
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

  let n = 0;
  const add = (x: number, y: number, size: number, alpha: number, cell: Cell) => {
    const o = n * FLOATS_PER_INSTANCE;
    inst[o] = x;
    inst[o + 1] = y;
    inst[o + 2] = size;
    inst[o + 3] = alpha;
    inst[o + 4] = cell[0];
    inst[o + 5] = cell[1];
    inst[o + 6] = cell[2];
    n++;
  };

  // Breathing central halo.
  const bl = 1150 * SIZE * (1 + 0.06 * wave(u, 2, 1.2));
  add(cx, cy, bl, clamp((0.42 + 0.12 * wave(u, 4, 0)) * GLOW, 0, 1), atlas.bloom);

  // Background glyph dust, periodic drift.
  for (const dd of dust) {
    const x = (((dd.x + dd.dir * u * dd.k * W) % W) + W) % W;
    const y = dd.y + 14 * wave(u, dd.k, dd.x);
    add(x, y, dd.s, dd.a, atlas.crisp[dd.ch]);
  }

  const glyphPass = (far: boolean) => {
    for (let i = 0; i < N; i++) {
      if (sz[i] > 0 !== far) continue;
      const a = bright[i];
      if (a < 0.03) continue;
      add(sx[i], sy[i], diam[i] * 1.6, a > 1 ? 1 : a, atlas.crisp[GLYPHS[i & 3]]);
    }
  };
  glyphPass(true);
  if (GLOW > 0) {
    for (let i = 0; i < N; i++) {
      const a = bright[i];
      if (a < 0.5) continue;
      add(sx[i], sy[i], diam[i] * 3.2, clamp((a - 0.5) * 0.85 * GLOW, 0, 1), atlas.halo[GLYPHS[i & 3]]);
    }
  }
  glyphPass(false);

  // Orbiting light.
  const fo = D / (D + ol[2]);
  add(cx + ol[0] * fo * SIZE, cy + ol[1] * fo * SIZE, 260 * fo * SIZE, clamp((ol[2] < 0 ? 0.55 : 0.25) * GLOW, 0, 1), atlas.bloom);

  return n;
}

/** Cover transform from design space to device pixels. */
type View = { width: number; height: number; k: number; ox: number; oy: number };

type Renderer = {
  draw(inst: Float32Array, count: number, view: View): void;
  dispose(): void;
};

const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aInst;
layout(location = 2) in vec3 aCell;
uniform vec2 uView;
uniform vec3 uCover;
uniform float uAtlas;
out vec2 vUv;
out float vAlpha;
void main() {
  vec2 p = aInst.xy + (aCorner - 0.5) * aInst.z;
  vec2 clip = (p * uCover.x + uCover.yz) / uView * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vUv = (aCell.xy + aCorner * aCell.z) / uAtlas;
  vAlpha = aInst.w;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
in float vAlpha;
uniform sampler2D uTex;
out vec4 outColor;
void main() {
  outColor = texture(uTex, vUv) * vAlpha;
}`;

function createGLRenderer(canvas: HTMLCanvasElement, atlas: Atlas): Renderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const instances = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_INSTANCES * FLOATS_PER_INSTANCE * 4, gl.DYNAMIC_DRAW);
  const stride = FLOATS_PER_INSTANCE * 4;
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 16);
  gl.vertexAttribDivisor(2, 1);

  // Premultiplied upload + mipmaps: glyphs shrink smoothly (like Canvas 2D's
  // high-quality smoothing) and blend exactly like source-over.
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uView = gl.getUniformLocation(program, "uView");
  const uCover = gl.getUniformLocation(program, "uCover");
  gl.uniform1f(gl.getUniformLocation(program, "uAtlas"), ATLAS);
  gl.uniform1i(gl.getUniformLocation(program, "uTex"), 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 1);

  return {
    draw(inst, count, view) {
      gl.viewport(0, 0, view.width, view.height);
      gl.uniform2f(uView, view.width, view.height);
      gl.uniform3f(uCover, view.k, view.ox, view.oy);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst, 0, count * FLOATS_PER_INSTANCE);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(corners);
      gl.deleteBuffer(instances);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}

/** Fallback for browsers without WebGL2: same draw list, same atlas. */
function create2DRenderer(canvas: HTMLCanvasElement, atlas: Atlas): Renderer | null {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  return {
    draw(inst, count, view) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, view.width, view.height);
      ctx.setTransform(view.k, 0, 0, view.k, view.ox, view.oy);
      ctx.imageSmoothingQuality = "high";
      for (let i = 0; i < count; i++) {
        const o = i * FLOATS_PER_INSTANCE;
        const s = inst[o + 2];
        ctx.globalAlpha = inst[o + 3];
        ctx.drawImage(atlas.canvas, inst[o + 4], inst[o + 5], inst[o + 6], inst[o + 6], inst[o] - s / 2, inst[o + 1] - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    },
    dispose() {},
  };
}

/**
 * Full-bleed animated background for the homepage hero. Fades in after the
 * first frame is drawn, pauses while scrolled out of view or in a hidden
 * tab, and holds a single still frame under prefers-reduced-motion. Runs at
 * the display's own refresh rate (rAF-synced, time-based clock).
 */
export default function HeroAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The hero's own box: what "on screen" means for pausing, since the canvas
  // itself is fixed and always in the viewport.
  const boxRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let scene: Scene | null = null;
    let renderer: Renderer | null = null;
    let raf = 0;
    let visible = true;
    // Animation clock that only advances while actually playing, so it
    // resumes where it left off instead of jumping after a pause.
    let clock = 0;
    let lastNow: number | null = null;
    const view: View = { width: 1, height: 1, k: 1, ox: 0, oy: 0 };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    // The system setting or "reduce animations" in the site's settings.
    const still = () => motionReduced();

    function fit() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const cw = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
      const k = Math.max(cw / W, ch / H);
      view.width = cw;
      view.height = ch;
      view.k = k;
      view.ox = (cw - W * k) / 2;
      view.oy = (ch - H * k) / 2;
    }

    function render() {
      if (!scene || !renderer) return;
      const count = buildFrame(scene, still() ? STILL_T : clock % TOTAL);
      renderer.draw(scene.inst, count, view);
    }

    function tick(now: number) {
      raf = 0;
      if (disposed || !visible || still()) return;
      if (lastNow !== null) clock += Math.min(now - lastNow, 100) / 1000;
      lastNow = now;
      render();
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (raf || disposed || !renderer || !visible || still()) return;
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

    // A lost GPU context (driver reset, too many contexts) just stops the
    // loop; the restored event rebuilds the renderer on the same canvas.
    function onContextLost(e: Event) {
      e.preventDefault();
      stop();
      renderer = null;
    }
    function onContextRestored() {
      if (!scene || !canvas) return;
      renderer = createGLRenderer(canvas, scene.atlas);
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
        renderer = createGLRenderer(canvas, scene.atlas) ?? create2DRenderer(canvas, scene.atlas);
        if (!renderer) return;
        canvas.addEventListener("webglcontextlost", onContextLost);
        canvas.addEventListener("webglcontextrestored", onContextRestored);
        fit();
        render();
        setReady(true);
        resize.observe(canvas);
        io.observe(boxRef.current ?? canvas);
        reduce.addEventListener("change", onMotionChange);
        window.addEventListener(MOTION_EVENT, onMotionChange);
        start();
      });

    return () => {
      disposed = true;
      stop();
      resize.disconnect();
      io.disconnect();
      reduce.removeEventListener("change", onMotionChange);
      window.removeEventListener(MOTION_EVENT, onMotionChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      renderer?.dispose();
    };
  }, []);

  return (
    // The canvas is pinned to the viewport (fixed) and clipped to the hero
    // (clip-path on this box), so it's never partly scrolled off screen.
    // A WebGL canvas half out of view isn't repainted right by browsers that
    // composite in software: the part still on screen froze as a dark block
    // over the search box. Pinned, it also gives the hero a parallax feel.
    <div aria-hidden ref={boxRef} className="pointer-events-none absolute inset-0 bg-void [clip-path:inset(0)]">
      <div className="fixed inset-x-0 bottom-0 top-12">
        <canvas
          ref={canvasRef}
          className={`block h-full w-full transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
        />
        {/* Flat scrim, no gradient: keeps the white type legible over any frame. */}
        <div className="absolute inset-0 bg-void/55" />
      </div>
    </div>
  );
}
