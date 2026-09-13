import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUpRight, BrainCircuit, ChartNoAxesCombined, Check, CirclePlay, Compass, Cpu, GraduationCap, Layers3, Sparkles, Target, Users, Zap } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Navbar from "../../components/Navbar";

gsap.registerPlugin(ScrollTrigger);

const features = [
  { icon: BrainCircuit, tag: "01 / AI", title: "Adaptive Intelligence", text: "A learning engine that reads your pace, strengths and gaps, then shapes what comes next." },
  { icon: ChartNoAxesCombined, tag: "02 / DATA", title: "Progress, decoded", text: "Turn scattered academic activity into a clear visual story of growth, skills and readiness." },
  { icon: Compass, tag: "03 / PATH", title: "Career navigation", text: "Explore realistic paths, compare skills and discover the moves that take you closer to your goal." },
  { icon: Users, tag: "04 / PEOPLE", title: "Human guidance", text: "Bring students, faculty, mentors and opportunities into one connected ecosystem." },
];

const steps = ["LEARN", "PRACTICE", "ANALYZE", "IMPROVE", "ACHIEVE"];

export default function Home() {
  const root = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-kicker, .hero-title, .hero-copy, .hero-actions, .hero-meta", {
        y: 35, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out"
      });
      gsap.from(".hero-orbit", { scale: 0.82, opacity: 0, rotate: -12, duration: 1.4, ease: "power3.out" });
      gsap.utils.toArray(".reveal").forEach((el) => {
        gsap.from(el, {
          y: 55, opacity: 0, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 82%", once: true }
        });
      });
      gsap.to(".hero-orbit", { y: -28, rotate: 5, ease: "none", scrollTrigger: { trigger: ".hero", scrub: 1 } });
      gsap.to(".grid-glow", { xPercent: 10, ease: "none", scrollTrigger: { trigger: ".hero", scrub: 1.4 } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <main ref={root} className="upnex-home">
      <Navbar />

      <section className="hero" id="home">
        <div className="grid-glow" />
        <div className="hero-left">
          <div className="hero-kicker"><span /> SMART EDUCATION ECOSYSTEM <b>01</b></div>
          <h1 className="hero-title">Your future<br /><em>shouldn't</em><br />be a guess.</h1>
          <p className="hero-copy">Turn your academic data, skills and goals into a clear path forward — with AI, real-world opportunities and guidance built around you.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/login"><GraduationCap size={18} /> Explore UPNEX <ArrowUpRight size={17} /></Link>
            <a className="btn btn-ghost" href="#intelligence"><CirclePlay size={17} /> See how it works</a>
          </div>
          <div className="hero-meta"><span><strong>10K+</strong> learners</span><i /> <span><strong>500+</strong> learning paths</span><i /> <span><strong>95%</strong> satisfaction</span></div>
        </div>

        <div className="hero-right">
          <div className="hero-orbit">
            <div className="orbit-ring ring-a" /><div className="orbit-ring ring-b" /><div className="orbit-ring ring-c" />
            <div className="core"><Sparkles size={24} /><span>UPNEX</span><small>INTELLIGENCE CORE</small></div>
            <div className="float-card fc-one"><Zap size={15} /><div><b>+24%</b><small>skill velocity</small></div></div>
            <div className="float-card fc-two"><Target size={15} /><div><b>87%</b><small>career match</small></div></div>
            <div className="float-card fc-three"><Cpu size={15} /><div><b>AI READY</b><small>next move found</small></div></div>
          </div>
          <div className="hero-side-note">TURN DATA<br /><strong>INTO</strong><br />DIRECTION.</div>
        </div>
        <a href="#problem" className="scroll-cue"><span>SCROLL TO EXPLORE</span><ArrowDown size={15} /></a>
      </section>

      <section className="problem section" id="problem">
        <div className="section-number">02</div>
        <div className="section-kicker reveal"><span /> THE PROBLEM</div>
        <div className="problem-grid">
          <div className="reveal"><h2>Students have potential<br />but <em>no clear direction.</em></h2><p className="large-copy">Too much information. Too many options. Not enough clarity.</p></div>
          <div className="problem-card reveal"><div className="radar"><div className="radar-line" /><div className="radar-dot d1" /><div className="radar-dot d2" /><div className="radar-dot d3" /><div className="radar-core">?</div></div><div className="question q1">Which career?</div><div className="question q2">What skills?</div><div className="question q3">Am I ready?</div><div className="question q4">What's next?</div></div>
        </div>
        <div className="problem-bottom reveal"><span>01 — CONFUSING CAREER PATHS</span><span>02 — DISCONNECTED RESOURCES</span><span>03 — LACK OF REAL GUIDANCE</span><a href="#intelligence">See the UPNEX approach <ArrowRight size={15} /></a></div>
      </section>

      <section className="intelligence section" id="intelligence">
        <div className="section-number">03</div>
        <div className="vision-head reveal"><div><div className="section-kicker"><span /> OUR VISION</div><h2>A smarter way to<br /><em>shape your tomorrow.</em></h2></div><p>UPNEX combines AI, data and real-world opportunities to give you personalized guidance for academics, skills and careers.</p></div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, tag, title, text }) => <article className="feature-card reveal" key={title}><div className="feature-icon"><Icon size={21} /></div><small>{tag}</small><h3>{title}</h3><p>{text}</p><ArrowUpRight className="feature-arrow" size={19} /></article>)}
        </div>
      </section>

      <section className="ecosystem section" id="ecosystem">
        <div className="section-number">04</div>
        <div className="ecosystem-top reveal"><div><div className="section-kicker"><span /> THE ECOSYSTEM</div><h2>One loop.<br /><em>Endless growth.</em></h2></div><p>Learning should never be a collection of disconnected tabs. UPNEX turns every action into the next opportunity.</p></div>
        <div className="journey reveal">{steps.map((step, i) => <div className="journey-step" key={step}><div className="journey-no">0{i + 1}</div><div className="journey-dot">{i === 4 ? <Check size={15} /> : i + 1}</div><b>{step}</b><span>{["Access knowledge that fits you", "Apply it in real situations", "See exactly where you stand", "Get your next best move", "Unlock your potential"][i]}</span></div>)}</div>
        <div className="ecosystem-panel reveal"><div className="panel-glow" /><div className="panel-title"><Layers3 size={18} /> UPNEX / LIVE LEARNING MAP</div><div className="map-score"><small>READINESS SCORE</small><strong>87<span>/100</span></strong><div className="progress"><i /></div><b>+12.4% this month</b></div><div className="map-nodes"><span className="active">AI</span><i /><span>DS</span><i /><span>UX</span><i /><span className="active">PM</span></div><div className="map-label">Your next opportunity is<br /><strong>3 skills away.</strong></div></div>
      </section>

      <section className="impact section" id="community">
        <div className="impact-inner reveal"><div className="section-kicker"><span /> THE IMPACT</div><h2>Real guidance.<br /><em>Real opportunities.</em></h2><p>Built for the generation that refuses to let uncertainty decide what comes next.</p><div className="stats"><div><strong>10K<span>+</span></strong><small>LEARNERS</small></div><div><strong>500<span>+</span></strong><small>PATHS</small></div><div><strong>100<span>+</span></strong><small>INSTITUTIONS</small></div><div><strong>95<span>%</span></strong><small>SATISFACTION</small></div></div><Link to="/dashboard" className="btn btn-light">Start your next chapter <ArrowUpRight size={17} /></Link></div>
        <div className="impact-orb"><div /><div /><div /><span>THE FUTURE<br /><b>BELONGS TO</b><br />THE PREPARED.</span></div>
      </section>

      <footer className="footer"><div><a className="footer-logo" href="#home">UPNEX</a><small>SMART EDUCATION ECOSYSTEM</small></div><div className="footer-links"><a href="#home">Home</a><a href="#problem">About</a><a href="#intelligence">Intelligence</a><a href="#ecosystem">Ecosystem</a></div><div className="footer-end">LEARN <span>•</span> GROW <span>•</span> SUCCEED</div></footer>
    </main>
  );
}
