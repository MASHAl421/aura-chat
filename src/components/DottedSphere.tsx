import { useEffect, useRef } from "react";

interface Props {
  size?: number;
  dotCount?: number;
  className?: string;
}

/**
 * ILAB-style rotating dotted sphere.
 * Pure canvas, no deps. Renders points on a unit sphere using a
 * Fibonacci lattice and projects them with a slow Y-axis rotation.
 */
export const DottedSphere = ({ size = 520, dotCount = 1800, className }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Fibonacci lattice points on unit sphere
    const pts: Array<[number, number, number]> = [];
    const phi = Math.PI * (Math.sqrt(5) - 1);
    for (let i = 0; i < dotCount; i++) {
      const y = 1 - (i / (dotCount - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r]);
    }

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.42;
    let raf = 0;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      for (let i = 0; i < pts.length; i++) {
        const [x, y, z] = pts[i];
        // Rotate around Y axis
        const xr = x * cosA + z * sinA;
        const zr = -x * sinA + z * cosA;
        // Perspective-ish depth shading
        const depth = (zr + 1) / 2; // 0 (back) → 1 (front)
        const alpha = 0.15 + depth * 0.85;
        const dotSize = 0.5 + depth * 1.4;
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(cx + xr * radius, cy + y * radius, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
      angle += 0.0025;
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [size, dotCount]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={className}
      aria-hidden
    />
  );
};

export default DottedSphere;