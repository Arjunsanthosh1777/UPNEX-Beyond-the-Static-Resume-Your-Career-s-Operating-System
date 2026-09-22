import { useEffect, useRef, useState } from "react";

// Animated SVG progress ring. `value` is 0–100; the ring fills itself on mount
// with a short ease, so numbers "count up" towards their target visually.
export default function ProgressRing({
  value = 0,
  size = 84,
  thickness = 7,
  gradientId = "pr-grad",
  children,
  className = ""
}) {
  const target = Math.max(0, Math.min(100, Math.round(value)));
  const [shown, setShown] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (!inView) return undefined;
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - shown / 100);

  return (
    <div ref={ref} className={`progress-ring ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`${shown}%`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8f6bff" />
            <stop offset="100%" stopColor="#b6a0ff" />
          </linearGradient>
        </defs>
        <circle className="pr-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} />
        <circle
          className="pr-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={thickness}
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="pr-center">
        {children == null
          ? <strong>{shown}%</strong>
          : (typeof children === "function" ? children(shown) : children)}
      </div>
    </div>
  );
}

function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}