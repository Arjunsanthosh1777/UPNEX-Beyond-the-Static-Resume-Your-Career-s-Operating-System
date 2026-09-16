import { useEffect } from "react";

function Mark() {
  return (
    <svg className="land-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <g transform="rotate(-30 12 12)">
        <circle cx="7.3" cy="3.2" r="1.45" />
        <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
        <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
        <circle cx="16.7" cy="20.8" r="1.45" />
      </g>
    </svg>
  );
}

function Spark() {
  return (
    <svg className="land-spark appear" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  const closeMobile = () => {
    const root = document.querySelector(".landing");
    const burger = root?.querySelector(".land-burger");
    root?.classList.remove("mobile-open");
    burger?.setAttribute("aria-expanded", "false");
    burger?.setAttribute("aria-label", "Open menu");
  };

  useEffect(() => {
    const root = document.querySelector(".landing");
    const flow = document.querySelector(".land-flow");
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const cleanup = () => cancelAnimationFrame(raf);

    if (flow && finePointer && !reduced) {
      let curX = 0, curY = 0, tx = 0, ty = 0;
      const onMove = (event) => {
        tx = (event.clientX / window.innerWidth) * 2 - 1;
        ty = (event.clientY / window.innerHeight) * 2 - 1;
      };
      const tick = () => {
        curX += (tx - curX) * 0.055;
        curY += (ty - curY) * 0.055;
        flow.style.setProperty("--px1", (curX * 22).toFixed(2) + "px");
        flow.style.setProperty("--py1", (curY * 12).toFixed(2) + "px");
        flow.style.setProperty("--px2", (curX * 30).toFixed(2) + "px");
        flow.style.setProperty("--py2", (curY * 16).toFixed(2) + "px");
        flow.style.setProperty("--px3", (curX * 14).toFixed(2) + "px");
        flow.style.setProperty("--py3", (curY * 8).toFixed(2) + "px");
        flow.style.setProperty("--px4", (curX * 9).toFixed(2) + "px");
        flow.style.setProperty("--py4", (curY * 5).toFixed(2) + "px");
        raf = requestAnimationFrame(tick);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(tick);
      return () => {
        window.removeEventListener("pointermove", onMove);
        cleanup();
      };
    }

    const burger = root?.querySelector(".land-burger");
    const open = () => {
      root?.classList.add("mobile-open");
      burger?.setAttribute("aria-expanded", "true");
      burger?.setAttribute("aria-label", "Close menu");
    };
    burger?.addEventListener("click", () => {
      if (root?.classList.contains("mobile-open")) closeMobile(); else open();
    });
    const onKey = (event) => { if (event.key === "Escape") closeMobile(); };
    document.addEventListener("keydown", onKey);

    if (!reduced) {
      const appearEls = [...document.querySelectorAll(".appear")];
      appearEls.forEach((el) => {
        el.addEventListener("animationend", () => el.classList.add("is-in"), { once: true });
      });
      const fallback = requestAnimationFrame(() => requestAnimationFrame(() => {
        const anyActive = appearEls.some((el) => (el.getAnimations ? el.getAnimations() : []).length > 0);
        if (!anyActive) appearEls.forEach((el) => el.classList.add("is-in"));
      }));
      return () => {
        document.removeEventListener("keydown", onKey);
        cancelAnimationFrame(fallback);
        cleanup();
      };
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      cleanup();
    };
  }, []);

  return (
    <div className="landing">
      <div className="land-backdrop" aria-hidden="true">
        <svg className="land-flow" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="land-ln-w" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="land-ln-w2" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="land-ln-p" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8b5cf6" stopOpacity="0" />
              <stop offset="0.5" stopColor="#8b5cf6" stopOpacity="1" />
              <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="flow-g1">
            <path className="ribbon r--blob" d="M -260 320 C 40 220 520 180 840 270 C 1160 360 1460 260 1860 330 C 1860 580 1480 660 1080 610 C 680 560 160 640 -260 560 Z" />
            <path className="ribbon r--floor" d="M -240 790 C 320 710 720 850 1140 760 C 1560 670 1700 780 1880 820 L 1880 950 L -240 950 Z" />
          </g>

          <g className="flow-g2">
            <path className="ribbon r--p" d="M 1900 720 C 1500 640 1260 400 880 480 C 520 556 260 760 -300 700" />
            <path className="ribbon r--core-p" d="M 1900 720 C 1500 640 1260 400 880 480 C 520 556 260 760 -300 700" />
          </g>

          <g className="flow-g3">
            <path className="ribbon r--w2" d="M -220 640 C 300 560 700 700 1120 600 C 1460 520 1720 620 1900 560" />
            <path className="ribbon r--silk" d="M -200 380 C 300 260 700 480 1100 360 C 1450 260 1800 420 1900 400" />
          </g>

          <g className="flow-g4">
            <path className="ribbon r--w1" d="M -260 140 C 160 60 400 340 800 280 C 1200 220 1500 60 1860 150" />
            <path className="ribbon r--core-w" d="M -260 140 C 160 60 400 340 800 280 C 1200 220 1500 60 1860 150" />
            <path className="ribbon r--thin" d="M -240 128 C 170 48 410 328 810 268 C 1210 208 1510 48 1870 138" />
          </g>
        </svg>
      </div>

      <div className="land-grain" aria-hidden="true" />

      <header className="land-header">
        <a className="land-logo appear" href="/" aria-label="UPNEX.ai home">
          <Mark />
          <span>UPNEX<span className="suffix">.ai</span></span>
        </a>

        <a className="land-cta appear" href="/register">Start for Free</a>

        <button className="land-burger" type="button" aria-expanded="false" aria-controls="land-menu" aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>
      </header>

      <main className="land-hero">
        <div className="land-halo" aria-hidden="true" />
        <div className="land-badge appear">
          <Spark />
          Student Intelligence Platform
        </div>

        <h1 className="land-title">
          <span className="land-line"><span className="appear">Stop listing skills.</span></span>
          <span className="land-line"><span className="appear">Start <em className="appear">proving</em> them.</span></span>
        </h1>

        <p className="land-lede appear">
          UPNEX turns academic marks, projects and certificates into one living, verifiable
          profile — and uses the evidence to map the career paths you should actually pursue.
        </p>

        <div className="land-cta-row">
          <a className="land-btn land-btn--solid appear" href="/register">Start for Free</a>
          <a className="land-btn land-btn--ghost appear" href="/login">Sign In</a>
        </div>
      </main>

      <footer className="land-stats">
        <span className="land-stat appear">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2.9l7 2.5v5.4c0 4.3-2.6 7.6-7 9.3-4.4-1.7-7-5-7-9.3V5.4z" />
            <path d="M9 11.7l2 2 4-4" />
          </svg>
          Verifiable proof-of-work
        </span>
        <span className="land-stat appear">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="6" cy="18" r="2.2" />
            <circle cx="18" cy="6" r="2.2" />
            <path d="M8.2 18c4-1.5 5.9-5.2 6.5-8.4" />
          </svg>
          AI-driven career pathing
        </span>
        <span className="land-stat appear">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3.5 7.2l8.5-3.7 8.5 3.7-8.5 3.7z" />
            <path d="M3.5 7.2v9.3l8.5 3.8 8.5-3.8V7.2" />
            <path d="M3.5 7.2l8.5 3.8 8.5-3.8M12 11v10" />
          </svg>
          Secure credential vault
        </span>
      </footer>

      <div className="land-mobile" id="land-menu" onClick={(event) => { if (event.target === event.currentTarget) closeMobile(); }}>
        <a href="/login" onClick={closeMobile}>Sign In</a>
        <a href="/register" onClick={closeMobile}>Get Started</a>
        <a href="/register" onClick={closeMobile} className="land-btn land-btn--solid land-mobile-cta">Start for Free</a>
        <button type="button" className="land-mobile-x" aria-label="Close menu" onClick={closeMobile}>×</button>
      </div>
    </div>
  );
}