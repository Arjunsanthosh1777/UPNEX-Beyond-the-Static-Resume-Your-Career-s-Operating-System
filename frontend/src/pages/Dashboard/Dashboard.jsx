import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, FileCheck2, FolderKanban, GraduationCap, LayoutDashboard, Menu, Plus, Search, ShieldCheck, Sparkles, Target, Upload, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const nav = [[LayoutDashboard, "Overview", "/dashboard"], [ShieldCheck, "Digital Vault", "/profile/vault"], [Target, "Subject Analysis", "/profile/analysis"], [BrainCircuit, "Career Guidance", "/profile/careers"], [FolderKanban, "Live Portfolio", "/profile/portfolio"]];
const initialForm = { subject: "", category: "", score: "" };

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("Overview");
  const [profile, setProfile] = useState({ documents: [], marks: [], projects: [], guidance: { paths: [] }, readiness: 0 });
  const [mark, setMark] = useState(initialForm);
  const [project, setProject] = useState({ title: "", description: "", skills: "", proofUrl: "" });
  const [message, setMessage] = useState("");

  async function loadProfile() { const { data } = await api.get("/profile"); setProfile(data); }
  useEffect(() => { loadProfile().catch(() => setMessage("Sign in to load your student profile.")); }, []);

  async function addDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setMessage("Documents must be smaller than 10 MB.");
    try { await api.post("/profile/documents", { fileName: file.name, fileSize: file.size, documentType: file.name.toLowerCase().includes("mark") ? "MARKSHEET" : "CERTIFICATE" }); setMessage(`${file.name} added to your verified vault.`); await loadProfile(); }
    catch (error) { setMessage(error.response?.data?.message || "Could not add this document."); }
    event.target.value = "";
  }

  async function addMark(event) {
    event.preventDefault();
    try { await api.post("/profile/marks", { ...mark, score: Number(mark.score) }); setMark(initialForm); setMessage("Subject analysis updated."); await loadProfile(); }
    catch (error) { setMessage(error.response?.data?.message || "Enter a valid subject and score."); }
  }

  async function addProject(event) {
    event.preventDefault();
    try { await api.post("/profile/projects", { ...project, skills: project.skills.split(",").map((skill) => skill.trim()).filter(Boolean) }); setProject({ title: "", description: "", skills: "", proofUrl: "" }); setMessage("Project added to your live portfolio."); await loadProfile(); }
    catch (error) { setMessage(error.response?.data?.message || "Complete the project details first."); }
  }

  const topPath = profile.guidance.paths[0];
  return <main className="main-app">
    <aside className={`app-sidebar ${open ? "open" : ""}`}><div className="app-brand"><span>U</span><div><b>UPNEX</b><small>SMART EDUCATION</small></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="sidebar-label">STUDENT PROFILE</div><nav>{nav.map(([Icon, name, path]) => <Link key={name} className={active === name ? "active" : ""} to={path} onClick={() => { setActive(name); setOpen(false); }}><Icon size={18} /><span>{name}</span>{active === name && <i />}</Link>)}</nav><div className="sidebar-bottom"><Link to="/"><ArrowRight size={18} /> Back to UPNEX</Link></div></aside>
    <section className="app-content"><header className="app-header"><button className="mobile-menu" onClick={() => setOpen(true)}><Menu size={21} /></button><div className="app-search"><Search size={17} /><input placeholder="Search your profile..." /></div><div className="header-actions"><div className="user-chip"><span>ST</span><div><b>Student</b><small>Student profile</small></div></div></div></header>
      <div className="app-body profile-body"><div className="app-hero-row"><div><div className="mini-kicker"><span /> YOUR UPNEX PROFILE</div><h1>Turn your work into <em>direction.</em></h1><p>One verified record for your academics, skills and next opportunity.</p></div><div className="readiness-pill"><strong>{profile.readiness}</strong><span>/100 readiness</span></div></div>
        {message && <div className="profile-message"><CheckCircle2 size={16} /> {message}</div>}
        <section className="workflow-grid"><WorkflowStep number="01" icon={ShieldCheck} title="Verify" text="Lock academic evidence into your Digital Vault." active={active === "Digital Vault"} onClick={() => setActive("Digital Vault")} /><WorkflowStep number="02" icon={Target} title="Understand" text="See strengths and gaps ranked by subject." active={active === "Subject Analysis"} onClick={() => setActive("Subject Analysis")} /><WorkflowStep number="03" icon={BrainCircuit} title="Navigate" text="Get career paths and skills you still need." active={active === "Career Guidance"} onClick={() => setActive("Career Guidance")} /><WorkflowStep number="04" icon={FolderKanban} title="Share" text="Publish verified proof-of-work for recruiters." active={active === "Live Portfolio"} onClick={() => setActive("Live Portfolio")} /></section>
        <section className="profile-command"><div><span>UPNEX CAREER SIGNAL</span><h2>{topPath ? `${topPath.title} is your strongest match.` : "Build your academic signal."}</h2><p>{topPath ? `${topPath.match}% match based on your marks and proof-of-work. Close the skill gaps below.` : "Add marks and a project to unlock personalized career guidance."}</p></div><div className="command-score"><Sparkles size={18} /><strong>{topPath?.match || 0}%</strong><small>top match</small></div></section>
        <div className="profile-columns"><section className="app-panel vault-panel"><PanelHeading icon={ShieldCheck} eyebrow="01 / DIGITAL VAULT" title="Verified evidence" /><label className="upload-zone"><Upload size={22} /><strong>Upload a marksheet or certificate</strong><span>PDF, JPG or PNG · max 10 MB</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={addDocument} /></label><div className="document-list">{profile.documents.length ? profile.documents.map((document) => <div className="document-row" key={document.id}><FileCheck2 size={17} /><div><b>{document.fileName}</b><small>{document.documentType} · {Math.ceil(document.fileSize / 1024)} KB</small></div><span>VERIFIED</span></div>) : <EmptyState text="Your verified documents will appear here." />}</div></section>
          <section className="app-panel marks-panel"><PanelHeading icon={Target} eyebrow="02 / SUBJECT ANALYSIS" title="Strengths, ranked honestly" /><div className="mark-list">{profile.marks.length ? profile.marks.map((item) => <div className="mark-row" key={item.id}><span>{item.subject}<small>{item.category}</small></span><div><i><b style={{ width: `${item.score}%` }} /></i><strong>{item.score}%</strong></div></div>) : <EmptyState text="Add your first subject score below." />}</div><form className="compact-form" onSubmit={addMark}><input placeholder="Subject" value={mark.subject} onChange={(event) => setMark({ ...mark, subject: event.target.value })} /><input placeholder="Category" value={mark.category} onChange={(event) => setMark({ ...mark, category: event.target.value })} /><input type="number" min="0" max="100" placeholder="Score" value={mark.score} onChange={(event) => setMark({ ...mark, score: event.target.value })} /><button className="icon-button" title="Add subject"><Plus size={16} /></button></form></section></div>
        <div className="profile-columns lower-profile-columns"><section className="app-panel guidance-panel"><PanelHeading icon={BrainCircuit} eyebrow="03 / CAREER GUIDANCE" title="Paths worth pursuing" />{profile.guidance.paths.map((path) => <div className="path-row" key={path.title}><div><b>{path.title}</b><small>Missing: {path.skills.join(" · ")}</small></div><strong>{path.match}%</strong></div>)}{!profile.guidance.paths.length && <EmptyState text="Your career matches will appear after analysis." />}</section><section className="app-panel portfolio-panel"><PanelHeading icon={FolderKanban} eyebrow="04 / LIVE PORTFOLIO" title="Proof-of-work" /><div className="portfolio-projects">{profile.projects.map((item) => <div className="project-row" key={item.id}><GraduationCap size={17} /><div><b>{item.title}</b><small>{item.skills.join(" · ")}</small></div></div>)}{!profile.projects.length && <EmptyState text="Add a project to make your profile recruiter-ready." />}</div><form className="project-form" onSubmit={addProject}><input placeholder="Project title" value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} /><input placeholder="Skills, comma separated" value={project.skills} onChange={(event) => setProject({ ...project, skills: event.target.value })} /><textarea placeholder="What did you build?" value={project.description} onChange={(event) => setProject({ ...project, description: event.target.value })} /><button className="app-primary" type="submit">Add to portfolio <ArrowRight size={15} /></button></form></section></div>
        <footer className="app-footer"><span>UPNEX / VERIFY · ANALYZE · NAVIGATE · SHARE</span><span>Private by default · controlled by you</span></footer></div></section>
  </main>;
}

function WorkflowStep({ number, icon: Icon, title, text, active, onClick }) { return <button className={`workflow-step ${active ? "active" : ""}`} onClick={onClick}><span>{number}</span><Icon size={19} /><div><b>{title}</b><small>{text}</small></div></button>; }
function PanelHeading({ icon: Icon, eyebrow, title }) { return <div className="panel-top profile-panel-heading"><div><span>{eyebrow}</span><h3>{title}</h3></div><Icon size={18} /></div>; }
function EmptyState({ text }) { return <div className="empty-state"><Users size={17} />{text}</div>; }