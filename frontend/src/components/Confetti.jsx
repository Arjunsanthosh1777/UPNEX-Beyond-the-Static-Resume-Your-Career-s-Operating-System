// Lightweight canvas confetti — no dependencies. Fires a celebratory burst
// from a point (or the whole viewport) and self-cleans once the pieces fall.
let canvas = null;
let raf = 0;
let pieces = [];
let running = false;

const COLORS = ["#b6a0ff", "#8f6bff", "#7c5cff", "#ffd166", "#4ade80", "#97c7ff", "#ff7b9c", "#ffffff"];

function cleanup() {
  cancelAnimationFrame(raf);
  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  canvas = null;
  pieces = [];
  running = false;
}

export function launchConfetti({ count = 150, x = null, y = null, spread = 1 } = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (!running) {
    canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483000;";
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    document.body.appendChild(canvas);
    running = true;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const originX = x == null ? w / 2 : x;
  const originY = y == null ? h * 0.4 : y;
  const dash = Math.max(1, spread);

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (2.5 + Math.random() * 5.5) * dash;
    pieces.push({
      x: originX + (Math.random() - 0.5) * 60 * dash,
      y: originY + (Math.random() - 0.5) * 40 * dash,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3.2 * dash,
      size: 5 + Math.random() * 5,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      shape: Math.random() < 0.35 ? "circle" : "rect",
      alpha: 1,
      decay: 0.016 + Math.random() * 0.018,
      flip: 0
    });
  }

  if (pieces.length > 600) pieces = pieces.slice(-600);

  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    pieces = pieces.filter((p) => p.alpha > 0.02 && p.y < h + 30);
    for (const p of pieces) {
      p.vy += 0.14;
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.flip += 0.12;
      p.alpha -= p.decay;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const sx = Math.abs(Math.sin(p.flip)) * p.size;
        ctx.fillRect(-sx / 2, -p.size / 2, sx, p.size);
      }
      ctx.restore();
    }
    if (pieces.length) {
      raf = requestAnimationFrame(tick);
    } else {
      cleanup();
    }
  };
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(tick);
}