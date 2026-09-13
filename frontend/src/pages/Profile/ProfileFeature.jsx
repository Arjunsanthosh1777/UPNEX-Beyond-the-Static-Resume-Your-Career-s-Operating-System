import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, ExternalLink, FileCheck2, FolderKanban, LayoutDashboard, Menu, Plus, Search, ShieldCheck, Sparkles, Target, Upload, Users, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import api from "../../services/api";

const navigation = [
  [LayoutDashboard, "Overview", "/dashboard"],
  [ShieldCheck, "Digital Vault", "/profile/vault"],
  [Target, "Subject Analysis", "/profile/analysis"],
  [BrainCircuit, "Career Guidance", "/profile/careers"],
  [FolderKanban, "Live Portfolio", "/profile/portfolio"]
];

const emptyProfile = { documents: [], marks: [], projects: [], guidance: { paths: [], strongest: "" }, readiness: 0 };
const pageCopy = {
  vault: { label: "01 / DIGITAL VAULT", title: "Your evidence, verified.", text: "Keep every mark sheet and certificate in one private, recruiter-ready record.", icon: ShieldCheck },
  analysis: { label: "02 / SUBJECT ANALYSIS", title: "See where your effort compounds.", text: "Rank your subjects from emerging strengths to the gaps worth closing next.", icon: Target },
  careers: { label: "03 / CAREER GUIDANCE", title: "Choose a direction with evidence.", text: "Match academic trends and proof-of-work to realistic paths, then see the exact next skills.", icon: BrainCircuit },
  portfolio: { label: "04 / LIVE PORTFOLIO", title: "Make your work discoverable.", text: "Turn projects into a living profile with a readiness signal recruiters can understand.", icon: FolderKanban }
};

export default function ProfileFeature({ type }) {
  const location = useLocation();
  const copy = pageCopy[type];
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(emptyProfile);
  const [message, setMessage] = useState("");
  const [mark, setMark] = useState({ subject: "", category: "", score: "" });
  const [project, setProject] = useState({ title: "", description: "", skills: "", proofUrl: "" });

  async function loadProfile() { const { data } = await api.get("/profile"); setProfile(data); }
  useEffect(() => { loadProfile().catch(() => setMessage("Sign in to load your student profile.")); }, []);

  async function uploadDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setMessage("Documents must be smaller than 10 MB.");
    try { await api.post("/profile/documents", { fileName: file.name, fileSize: file.size, documentType: file.name.toLowerCase().includes("mark") ? "MARKSHEET" : "CERTIFICATE" }); setMessage("Document verified and added to your vault."); await loadProfile(); }
    catch (error) { setMessage(error.response?.data?.message || "Could not add this document."); }
    event.target.value = "";
  }

  async function addMark(event) {
    event.preventDefault();
    try { await api.post("/profile/marks", { ...mark, score: Number(mark.score) }); setMark({ subject: "", category: "", score: "" }); setMessage("Subject analysis updated."); await loadProfile(); }
    catch (error) { setMessage(error.response?.data?.message || "Enter a valid subject and score."); }
  }

  async function addProject(event) {
    event.preventDefault();
    try { await api.post("/profile/projects", { ...project, skills: project.skills.split(",").map((skill) => skill.trim()).filter(Boolean) }); setProject({ title: "", description: "", skills: "", proofUrl: "" }); setMessage("Project added to your live portfolio."); await loadProfile(); }
    catch (error) { setMessage(error.response?.data?.message || "Complete the project details first."); }
  }

  return <main className="main-app">
    <aside className={`app-sidebar ${open ? "open" : ""}`}><div className="app-brand"><span>U</span><div><b>UPNEX</b><small>SMART EDUCATION</small></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="sidebar-label">STUDENT PROFILE</div><nav>{navigation.map(([Icon, name, path]) => <Link key={name} className={location.pathname === path ? "active" : ""} to={path} onClick={() => setOpen(false)}><Icon size={18} /><span>{name}</span>{location.pathname === path && <i />}</Link>)}</nav><div className="sidebar-bottom"><Link to="/"><ArrowRight size={18} /> Back to UPNEX</Link></div></aside>
    <section className="app-content"><header className="app-header"><button className="mobile-menu" onClick={() => setOpen(true)}><Menu size={21} /></button><div className="app-search"><Search size={17} /><input placeholder="Search your profile..." /></div><div className="header-actions"><div className="user-chip"><span>ST</span><div><b>Student</b><small>Student profile</small></div></div></div></header>
      <div className="app-body feature-body"><div className="feature-hero"><div><div className="mini-kicker"><span /> {copy.label}</div><h1>{copy.title}</h1><p>{copy.text}</p></div><div className="feature-score"><Sparkles size={17} /><strong>{profile.readiness}</strong><span>readiness</span></div></div>{message && <div className="profile-message"><CheckCircle2 size={16} /> {message}</div>}
        {type === "vault" && <Vault profile={profile} uploadDocument={uploadDocument} />}
        {type === "analysis" && <Analysis profile={profile} mark={mark} setMark={setMark} addMark={addMark} />}
        {type === "careers" && <Careers profile={profile} />}
        {type === "portfolio" && <Portfolio profile={profile} project={project} setProject={setProject} addProject={addProject} />}
        <footer className="app-footer"><span>UPNEX / VERIFY · ANALYZE · NAVIGATE · SHARE</span><span>Private by default · controlled by you</span></footer>
      </div>
    </section>
  </main>;
}

function PanelHeading({ icon: Icon, eyebrow, title }) { return <div className="panel-top profile-panel-heading"><div><span>{eyebrow}</span><h3>{title}</h3></div><Icon size={18} /></div>; }
function EmptyState({ text }) { return <div className="empty-state"><Users size={17} />{text}</div>; }

function Vault({ profile, uploadDocument }) { return <div className="feature-grid feature-vault"><section className="app-panel feature-main-panel"><PanelHeading icon={ShieldCheck} eyebrow="SECURE RECORD" title="Documents in your vault" /><label className="upload-zone feature-upload"><Upload size={25} /><strong>Drop a marksheet or certificate here</strong><span>PDF, JPG or PNG · max 10 MB</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={uploadDocument} /></label><div className="document-list">{profile.documents.length ? profile.documents.map((document) => <div className="document-row" key={document.id}><FileCheck2 size={18} /><div><b>{document.fileName}</b><small>{document.documentType} · {Math.ceil(document.fileSize / 1024)} KB</small></div><span>VERIFIED</span></div>) : <EmptyState text="Your verified documents will appear here." />}</div></section><section className="app-panel feature-side-panel"><div className="vault-orbit"><ShieldCheck size={30} /></div><h3>Trust, built in.</h3><p>Verified evidence strengthens every recommendation and gives recruiters a clear signal.</p><div className="feature-stat"><strong>{profile.documents.filter((document) => document.verified).length}</strong><span>verified documents</span></div></section></div>; }

function Analysis({ profile, mark, setMark, addMark }) { const average = profile.guidance.average || 0; return <><div className="analysis-overview"><div className="app-panel"><span className="feature-eyebrow">ACADEMIC PULSE</span><strong className="big-number">{average}%</strong><p>average across {profile.marks.length} tracked subjects</p></div><div className="app-panel"><span className="feature-eyebrow">STRONGEST SIGNAL</span><strong className="big-label">{profile.guidance.strongest || "Add your first mark"}</strong><p>the category showing the most momentum</p></div></div><div className="feature-grid feature-analysis"><section className="app-panel feature-main-panel"><PanelHeading icon={Target} eyebrow="RANKED FROM LOW TO HIGH" title="Your subject landscape" />{profile.marks.length ? profile.marks.map((item) => <div className="mark-row" key={item.id}><span>{item.subject}<small>{item.category}</small></span><div><i><b style={{ width: `${item.score}%` }} /></i><strong>{item.score}%</strong></div></div>) : <EmptyState text="Add scores to reveal your subject landscape." />}</section><section className="app-panel feature-side-panel"><PanelHeading icon={Plus} eyebrow="ADD A SIGNAL" title="Track a subject" /><form className="stack-form" onSubmit={addMark}><input placeholder="Subject" value={mark.subject} onChange={(event) => setMark({ ...mark, subject: event.target.value })} /><input placeholder="Category e.g. Core" value={mark.category} onChange={(event) => setMark({ ...mark, category: event.target.value })} /><input type="number" min="0" max="100" placeholder="Score out of 100" value={mark.score} onChange={(event) => setMark({ ...mark, score: event.target.value })} /><button className="app-primary" type="submit">Save score <ArrowRight size={15} /></button></form></section></div></>;
}

function Careers({ profile }) { return <><section className="career-banner"><div><span>AI ENHANCEMENT COORDINATOR</span><h2>{profile.guidance.strongest ? `Your strongest signal is ${profile.guidance.strongest}.` : "Your next path starts with your data."}</h2><p>These matches combine your academic average, project skills and verified evidence.</p></div><div className="command-score"><Sparkles size={18} /><strong>{profile.readiness}%</strong><small>ready today</small></div></section><div className="career-list">{profile.guidance.paths.length ? profile.guidance.paths.map((path, index) => <article className={`career-card ${index === 0 ? "recommended" : ""}`} key={path.title}><div className="career-rank">0{index + 1}</div><div className="career-card-content"><span>{index === 0 ? "RECOMMENDED NEXT" : "POSSIBLE DIRECTION"}</span><h3>{path.title}</h3><p>Close these gaps to become opportunity-ready:</p><div className="skill-chips">{path.skills.map((skill) => <b key={skill}>{skill}</b>)}</div></div><strong className="career-match">{path.match}%<small>match</small></strong></article>) : <div className="app-panel"><EmptyState text="Add marks and projects to generate career matches." /></div>}</div></>; }

function Portfolio({ profile, project, setProject, addProject }) { return <><section className="portfolio-banner"><div><span>PUBLIC PROFILE PREVIEW</span><h2>Student / UPNEX profile</h2><p>Verified evidence, visible progress and proof-of-work in one link.</p></div><button className="app-secondary"><ExternalLink size={15} /> Preview share page</button></section><div className="feature-grid feature-portfolio"><section className="app-panel feature-main-panel"><PanelHeading icon={FolderKanban} eyebrow="PROOF-OF-WORK" title={`${profile.projects.length} projects published`} />{profile.projects.length ? profile.projects.map((item) => <article className="portfolio-card" key={item.id}><div className="project-symbol"><FolderKanban size={20} /></div><div><h3>{item.title}</h3><p>{item.description}</p><div className="skill-chips">{item.skills.map((skill) => <b key={skill}>{skill}</b>)}</div></div><ArrowRight size={17} /></article>) : <EmptyState text="Your projects will become recruiter-ready cards here." />}</section><section className="app-panel feature-side-panel"><PanelHeading icon={Plus} eyebrow="ADD PROJECT" title="Show what you built" /><form className="stack-form" onSubmit={addProject}><input placeholder="Project title" value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} /><input placeholder="Skills, comma separated" value={project.skills} onChange={(event) => setProject({ ...project, skills: event.target.value })} /><textarea placeholder="What did you build?" value={project.description} onChange={(event) => setProject({ ...project, description: event.target.value })} /><button className="app-primary" type="submit">Publish project <ArrowRight size={15} /></button></form></section></div></>;
}
