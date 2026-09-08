/**
 * GLSL shader element — an animated, WebGL-powered backdrop for widgets.
 *
 * Four hand-written fragment-shader presets (aurora, plasma, mesh, starfield)
 * run on a raw WebGL context: no three.js, no extra dependencies, ~5 KB of
 * shader code. The canvas fills the element's box, honours its corner radius
 * (clipped by the element wrapper) and its opacity, and cleans up after
 * itself on unmount. If WebGL is unavailable the element degrades to a static
 * CSS gradient in the same palette, so a design never renders broken.
 */
import { useEffect, useRef } from 'react';
import type { ShaderPreset } from './types';

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG: Record<ShaderPreset, string> = {
  aurora: `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec3 col = vec3(0.024, 0.043, 0.106);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float t = u_time * 0.35 + fi * 2.1;
    float y = 0.5 + 0.22 * sin(uv.x * 4.0 + t) + 0.08 * sin(uv.x * 11.0 - t * 1.7);
    float d = abs(uv.y - y);
    float glow = 0.018 / (d * d + 0.0016);
    vec3 tint = fi < 0.5 ? vec3(0.10, 0.90, 0.70) : (fi < 1.5 ? vec3(0.30, 0.50, 1.00) : vec3(0.80, 0.30, 0.90));
    col += tint * glow * 0.13;
  }
  gl_FragColor = vec4(col, 1.0);
}`,
  plasma: `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
vec3 pal(float t) { return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67))); }
void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_res.x / max(u_res.y, 1.0);
  float t = u_time * 0.4;
  float v = sin(p.x * 2.0 + t) + sin(p.y * 2.3 - t * 1.2) + sin((p.x + p.y) * 1.7 + t * 0.7);
  v += length(p) * 0.6;
  vec3 col = pal(v * 0.33 + 0.42);
  col = mix(col, col * col, 0.35); // deepen — printable, not rainbow-loud
  gl_FragColor = vec4(col, 1.0);
}`,
  mesh: `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float t = u_time * 0.25;
  vec3 coral = vec3(0.965, 0.42, 0.24);
  vec3 amber = vec3(0.95, 0.77, 0.26);
  vec3 teal  = vec3(0.07, 0.63, 0.76);
  vec3 navy  = vec3(0.10, 0.15, 0.36);
  vec3 col = mix(navy, coral, smoothstep(0.0, 1.0, uv.y));
  vec2 c1 = vec2(0.5 + 0.30 * sin(t), 0.45 + 0.25 * cos(t * 1.3));
  vec2 c2 = vec2(0.5 - 0.32 * cos(t * 0.8), 0.55 + 0.30 * sin(t * 1.1));
  col = mix(col, teal,  smoothstep(0.95, 0.0, distance(uv, c1)));
  col = mix(col, amber, smoothstep(0.85, 0.0, distance(uv, c2)));
  gl_FragColor = vec4(col, 1.0);
}`,
  stars: `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec3 col = vec3(0.045, 0.066, 0.145);
  col += vec3(0.09, 0.14, 0.34) * (0.4 + 0.3 * sin(uv.y * 3.0 + u_time * 0.2)); // nebula wash
  vec2 grid = uv * 30.0;
  grid.x -= u_time * 0.5;
  vec2 cell = floor(grid);
  vec2 f = fract(grid) - 0.5;
  float h = hash(cell);
  if (h > 0.9) {
    vec2 off = (vec2(hash(cell + 1.7), hash(cell + 3.1)) - 0.5) * 0.6;
    float d = length(f - off);
    float tw = 0.5 + 0.5 * sin(u_time * (1.0 + h * 3.0) + h * 40.0);
    col += vec3(0.92, 0.96, 1.0) * (0.012 / (d * d + 0.0009)) * tw;
  }
  gl_FragColor = vec4(col, 1.0);
}`,
};

/** Static fallbacks (same palettes) for environments without WebGL. */
const CSS_FALLBACK: Record<ShaderPreset, string> = {
  aurora: 'linear-gradient(160deg, #060b1b 0%, #0d2b3a 45%, #231043 100%)',
  plasma: 'radial-gradient(circle at 30% 30%, #4c1d95, #0f172a 70%)',
  mesh: 'linear-gradient(135deg, #1a265c 0%, #f06a3d 60%, #f0c243 100%)',
  stars: 'radial-gradient(circle at 60% 20%, #101a3f, #05070f 75%)',
};

function compile(gl: WebGLRenderingContext, kind: number, src: string): WebGLShader | null {
  const sh = gl.createShader(kind);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function ShaderCanvas({ preset, speed = 1 }: { preset: ShaderPreset; speed?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'low-power' });
    if (!gl) return; // CSS fallback gradient stays visible underneath

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG[preset] ?? FRAG.aurora);
    const prog = vs && fs ? gl.createProgram() : null;
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // One fullscreen triangle — no buffers of quads needed.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');

    let raf = 0;
    let alive = true;
    const start = performance.now();

    const resize = (): void => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const frame = (now: number): void => {
      if (!alive) return;
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, ((now - start) / 1000) * Math.max(0.05, speed));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onLost = (e: Event): void => {
      e.preventDefault();
      alive = false;
      cancelAnimationFrame(raf);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [preset, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="studio-shader-canvas"
      style={{ background: CSS_FALLBACK[preset] ?? CSS_FALLBACK.aurora }}
      aria-hidden
    />
  );
}
