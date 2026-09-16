import { useEffect } from "react";

/**
 * Renders the animated starfield behind the auth screens onto the canvas
 * referenced by `canvasRef`. Sizes the canvas to its parent, respects
 * prefers-reduced-motion, and cleans itself up on unmount.
 */
export function useStarfield(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame;
    let resizeObserver;
    let width = 0;
    let height = 0;
    let dots = [];
    let startedAt = performance.now();

    function resize() {
      const bounds = canvas.parentElement.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      dots = [];
      for (let y = 10; y < height + 20; y += 20) {
        for (let x = 10; x < width + 20; x += 20) {
          const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          const random = seed - Math.floor(seed);
          dots.push({ x, y, phase: random * Math.PI * 2, speed: 0.35 + random * 0.75, strength: 0.18 + random * 0.22, highlight: random > 0.9, delay: random * 900 });
        }
      }
    }

    function draw(now) {
      const elapsed = now - startedAt;
      context.clearRect(0, 0, width, height);
      const motion = reducedMotion.matches ? 0 : elapsed;
      const shimmer = ((motion * 0.035) % (width + height + 260)) - 130;
      for (const dot of dots) {
        const twinkle = 0.65 + Math.sin(motion * 0.001 * dot.speed + dot.phase) * 0.35;
        const distance = Math.abs(dot.x + dot.y - shimmer);
        const sweep = Math.max(0, 1 - distance / 90);
        const pulse = dot.highlight && !reducedMotion.matches ? Math.max(0, Math.sin((motion + dot.delay) * 0.0011 + dot.phase)) ** 8 : 0;
        const alpha = Math.min(0.92, dot.strength * twinkle + sweep * 0.25 + pulse * 0.58);
        if (pulse > 0.02) {
          const glow = context.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, 25 + pulse * 10);
          glow.addColorStop(0, `rgba(255,255,255,${pulse * 0.55})`);
          glow.addColorStop(0.24, `rgba(218,201,255,${pulse * 0.27})`);
          glow.addColorStop(1, "rgba(106,63,180,0)");
          context.fillStyle = glow;
          context.fillRect(dot.x - 35, dot.y - 35, 70, 70);
        }
        const lavender = sweep > 0.08 || pulse > 0.02;
        context.fillStyle = lavender ? `rgba(232,224,255,${alpha})` : `rgba(223,229,239,${alpha})`;
        context.fillRect(dot.x - 2.5, dot.y - 2.5, 5, 5);
      }
      frame = requestAnimationFrame(draw);
    }

    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
    };
  }, [canvasRef]);
}
