import { useState } from "react";
import {
  Activity, ArrowRight, Bell, BookOpen, BrainCircuit, CalendarDays,
  CheckCircle2, ChevronRight, CircleHelp, Clock3, Flame, GraduationCap,
  LayoutDashboard, Menu, Play, Search, Settings, Sparkles, Target, Trophy,
  Users, X, Zap
} from "lucide-react";
import { Link } from "react-router-dom";

const courses = [
  { title: "Full Stack Development", meta: "12 modules · 82% complete", progress: 82, tag: "CONTINUE", art: "course-blue" },
  { title: "AI & Machine Learning", meta: "18 modules · 34% complete", progress: 34, tag: "KEEP GOING", art: "course-violet" },
  { title: "Product Design Systems", meta: "9 modules · 12% complete", progress: 12, tag: "START NEXT", art: "course-cyan" },
];

const nav = [
  [LayoutDashboard, "Overview"], [BookOpen, "My Learning"], [GraduationCap, "Courses"],
  [BrainCircuit, "AI Tutor"], [Target, "Assessments"], [Activity, "Progress"], [Trophy, "Achievements"]
];

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("Overview");

  return (
    <main className="main-app">
      <aside className={`app-sidebar ${open ? "open" : ""}`}>
        <div className="app-brand"><span>U</span><div><b>UPNEX</b><small>SMART EDUCATION</small></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={18}/></button></div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav>{nav.map(([Icon, name]) => <button key={name} className={active === name ? "active" : ""} onClick={() => { setActive(name); setOpen(false); }}><Icon size={18}/><span>{name}</span>{active === name && <i />}</button>)}</nav>
        <div className="sidebar-bottom">
          <button><Users size={18}/> Community</button>
          <button><Settings size={18}/> Settings</button>
          <Link to="/"><ArrowRight size={18}/> Back to UPNEX</Link>
        </div>
      </aside>

      <section className="app-content">
        <header className="app-header">
          <button className="mobile-menu" onClick={() => setOpen(true)}><Menu size={21}/></button>
          <div className="app-search"><Search size={17}/><input placeholder="Search courses, skills, topics..." /></div>
          <div className="header-actions"><button><CircleHelp size={19}/></button><button className="notification"><Bell size={19}/><i /></button><div className="user-chip"><span>AK</span><div><b>Alex Kumar</b><small>Student · Level 12</small></div></div></div>
        </header>

        <div className="app-body">
          <div className="app-hero-row">
            <div><div className="mini-kicker"><span/> YOUR LEARNING SPACE</div><h1>Good morning, Alex <span>✦</span></h1><p>Your next breakthrough is closer than you think.</p></div>
            <div className="streak-pill"><Flame size={18}/><strong>18</strong><span>day streak</span></div>
          </div>

          <section className="command-card">
            <div className="command-copy"><span>UPNEX AI · PERSONALIZED NEXT MOVE</span><h2>Master React Architecture</h2><p>Based on your recent activity, this is the highest-impact skill for your current path.</p><div className="command-actions"><button className="app-primary"><Play size={15}/> Continue learning</button><button className="app-secondary">Why this? <ArrowRight size={15}/></button></div></div>
            <div className="command-visual"><div className="command-orbit"><span/><span/><span/><b><BrainCircuit size={25}/><small>AI</small></b></div><div className="ai-badge"><Sparkles size={13}/> 94% MATCH</div></div>
          </section>

          <div className="metric-grid">
            <Metric icon={Flame} value="18" label="Learning streak" extra="+4 days" />
            <Metric icon={BookOpen} value="24" label="Courses completed" extra="+3 this month" />
            <Metric icon={Clock3} value="186h" label="Learning time" extra="+18h this week" />
            <Metric icon={Zap} value="94%" label="Skill score" extra="+7.2%" />
          </div>

          <div className="section-title"><div><span>01</span><h2>Continue your journey</h2></div><button>View all <ArrowRight size={15}/></button></div>
          <div className="course-grid">{courses.map(c => <CourseCard key={c.title} {...c}/>)}</div>

          <div className="lower-grid">
            <section className="app-panel progress-panel"><div className="panel-top"><div><span>LEARNING ANALYTICS</span><h3>Your progress, decoded.</h3></div><button>Last 30 days <ChevronRight size={15}/></button></div><div className="chart"><div className="chart-line"><i/><i/><i/><i/><i/><i/><i/></div><div className="chart-grid"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><svg viewBox="0 0 700 210" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4f8cff" stopOpacity=".35"/><stop offset="1" stopColor="#4f8cff" stopOpacity="0"/></linearGradient></defs><path d="M0 172 C80 160 95 128 160 145 S250 110 310 125 S390 72 450 90 S545 48 600 70 S665 30 700 42 L700 210 L0 210 Z" fill="url(#area)"/><path d="M0 172 C80 160 95 128 160 145 S250 110 310 125 S390 72 450 90 S545 48 600 70 S665 30 700 42" fill="none" stroke="#4f8cff" strokeWidth="3"/></svg><div className="chart-months"><span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>NOW</span></div></div></section>
            <section className="app-panel readiness-panel"><div className="panel-top"><div><span>AI READINESS</span><h3>Career readiness</h3></div><Sparkles size={18}/></div><div className="readiness-ring"><div><strong>87</strong><small>/100</small></div></div><div className="readiness-copy"><b>You're 3 skills away.</b><span>from your next opportunity</span></div><div className="skill-row"><span>React Architecture</span><b>92%</b></div><div className="skill-row"><span>System Design</span><b>76%</b></div><div className="skill-row"><span>Communication</span><b>68%</b></div></section>
          </div>

          <section className="opportunity"><div><span>UPNEXT SIGNAL</span><h2>Your learning activity is creating momentum.</h2><p>Keep your current pace for 14 more days and unlock the <b>Advanced Builder</b> achievement.</p></div><div className="signal"><div><Activity size={19}/><b>+12.4%</b><span>velocity</span></div><ArrowRight size={24}/></div></section>

          <footer className="app-footer"><span>UPNEX / LEARN · GROW · SUCCEED</span><span>AI-powered education ecosystem</span></footer>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, value, label, extra }) { return <div className="metric"><div className="metric-icon"><Icon size={18}/></div><div><strong>{value}</strong><span>{label}</span><small>{extra}</small></div></div>; }
function CourseCard({ title, meta, progress, tag, art }) { return <article className="course-card"><div className={`course-art ${art}`}><div className="art-grid"/><span>{progress}%</span><div className="art-symbol"><BrainCircuit size={28}/></div></div><div className="course-info"><div className="course-tag">{tag}</div><h3>{title}</h3><p>{meta}</p><div className="course-progress"><i style={{ width: `${progress}%` }}/></div><button>Open course <ArrowRight size={15}/></button></div></article>; }
