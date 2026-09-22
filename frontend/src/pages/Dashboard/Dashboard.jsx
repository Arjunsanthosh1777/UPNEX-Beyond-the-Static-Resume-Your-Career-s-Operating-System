import { useState } from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, ClipboardCheck, FileCheck2, FolderKanban, GraduationCap, LayoutDashboard, Menu, Network, Plus, ScrollText, Search, Settings, Share2, ShieldCheck, Sparkles, Target, Trash2, Upload, Users, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStudentProfile } from "../../hooks/useStudentProfile";
import { useAuth } from "../../context/AuthContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import ThemeSwitcher from "../../components/ThemeSwitcher";
import NotificationBell from "../../components/NotificationBell";
import ShareModal from "../../components/profile/ShareModal";
import ProgressRing from "../../components/ProgressRing";
import { Mark } from "../../components/Logo";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("");
  const [showShare, setShowShare] = useState(false);

  const nextSteps = [
    [LayoutDashboard, t("nav.overview", "Overview"), "/dashboard"],
    [ShieldCheck, t("nav.vault", "Digital Vault"), "/profile/vault"],
    [Target, t("nav.analysis", "Subject Analysis"), "/profile/analysis"],
    [BrainCircuit, t("nav.careers", "Career Guidance"), "/profile/careers"],
    [FolderKanban, t("nav.portfolio", "Live Portfolio"), "/profile/portfolio"],
    [Network, t("nav.skillBridge", "Skill Bridge"), "/profile/skill-bridge"],
    [ScrollText, t("nav.passport", "Career Passport"), "/profile/passport"],
    [Settings, t("nav.settings", "Settings"), "/profile/settings"]
  ];

  const isStaff = Boolean(user && (user.role === "ADMIN" || user.role === "TEACHER"));
  const nav = isStaff
    ? [...nextSteps, [ClipboardCheck, t("nav.reviewQueue", "Review queue"), "/admin"]]
    : nextSteps;

  const {
    profile,
    message,
    mark,
    setMark,
    project,
    setProject,
    addDocument,
    addMark,
    deleteMark,
    addProject,
    loadDemoData
  } = useStudentProfile({
    documentSuccessMessage: (fileName) => t("profiler.docAdded", "{{name}} added to your vault (pending review).", { name: fileName })
  });

  const topPath = profile.guidance.paths[0];
  return <main className="main-app">
    <aside className={`app-sidebar ${open ? "open" : ""}`}><div className="app-brand"><Mark /><div><b>UPNEX</b><small>{t("nav.smartEducation", "SMART EDUCATION")}</small></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="sidebar-label">{t("nav.studentProfile", "STUDENT PROFILE")}</div><nav>{nav.map(([Icon, name, path]) => <Link key={path} className={location.pathname === path ? "active" : ""} to={path} onClick={() => setOpen(false)}><Icon size={18} /><span>{name}</span>{location.pathname === path && <i />}</Link>)}</nav><div className="sidebar-bottom"><Link to="/"><ArrowRight size={18} /> {t("nav.backToUpnex", "Back to UPNEX")}</Link></div></aside>
    <section className="app-content"><header className="app-header"><button className="mobile-menu" onClick={() => setOpen(true)}><Menu size={21} /></button><div className="app-search"><Search size={17} /><input placeholder={t("nav.searchPlaceholder", "Search your profile...")} /></div><div className="header-actions"><button className="share-chiplike" onClick={() => setShowShare(true)} disabled={!profile.username}><Share2 size={13} /> {t("nav.share", "Share")}</button><NotificationBell /><LanguageSwitcher /><ThemeSwitcher /><div className="user-chip"><span>ST</span><div><b>{t("nav.studentLabel", "Student")}</b><small>{t("nav.studentProfileShort", "Student profile")}</small></div></div></div></header>
      <div className="app-body profile-body"><div className="app-hero-row"><div><div className="mini-kicker"><span /> {t("app.kicker", "YOUR UPNEX PROFILE")}</div><h1>{t("app.heroTitleA", "Turn your work into ")}<em>{t("app.heroTitleB", "direction.")}</em></h1><p>{t("app.heroSub", "One verified record for your academics, skills and next opportunity.")}</p></div><div className="hero-tools"><div className="readiness-pill ring-pill"><ProgressRing value={profile.readiness} size={64} thickness={6}>{(shown) => <strong>{shown}</strong>}</ProgressRing><span>{t("app.readinessFull", "% readiness")}</span></div>{!profile.marks.length && <button type="button" className="demo-chip" onClick={loadDemoData}><Sparkles size={13} /> {t("dashboard.loadDemo", "Load sample data")}</button>}</div></div>
        {message && <div className="profile-message"><CheckCircle2 size={16} /> {message}</div>}
        <section className="workflow-grid"><WorkflowStep number="01" icon={ShieldCheck} title={t("app.verify", "Verify")} text={t("app.verifySub", "Upload marksheets and certificates to a secure, signed-link vault.")} active={step === "vault"} path="/profile/vault" /><WorkflowStep number="02" icon={Target} title={t("app.understand", "Understand")} text={t("app.understandSub", "Turn marks into clear academic and skill signals.")} active={step === "analysis"} path="/profile/analysis" /><WorkflowStep number="03" icon={BrainCircuit} title={t("app.navigate", "Navigate")} text={t("app.navigateSub", "Match your evidence to real career paths.")} active={step === "careers"} path="/profile/careers" /><WorkflowStep number="04" icon={FolderKanban} title={t("app.share", "Share")} text={t("app.shareSub", "Publish one living profile that recruiters can trust.")} active={step === "portfolio"} path="/profile/portfolio" /></section>
        <section className="profile-command"><div><span>{t("dashboard.careerSignalTitle", "UPNEX CAREER SIGNAL")}</span><h2>{topPath ? t("dashboard.strongestSignal", "{{role}} is your strongest match.", { role: topPath.title }) : t("dashboard.buildSignal", "Build your academic signal.")}</h2><p>{topPath ? `${topPath.match}${t("dashboard.matchPercent", "% match based on your marks and proof-of-work evidence.")}` : t("dashboard.buildSignalHint", "Add marks and a project to unlock personalized career guidance.")}</p></div><div className="command-score"><Sparkles size={18} /><strong>{topPath?.match || 0}%</strong><small>{t("dashboard.topMatch", "top match")}</small></div></section>
        <div className="profile-columns"><section className="app-panel vault-panel"><PanelHeading icon={ShieldCheck} eyebrow={t("vault.kicker", "01 / DIGITAL VAULT")} title={t("dashboard.yourEvidence", "Your evidence")} /><label className="upload-zone"><Upload size={22} /><strong>{t("dashboard.uploadHint", "Upload a marksheet or certificate")}</strong><span>{t("dashboard.pdfHint", "PDF, JPG or PNG · max 10 MB")}</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={addDocument} /></label><div className="document-list">{profile.documents.length ? profile.documents.map((document) => <div className="document-row" key={document.id}><FileCheck2 size={17} /><div><b>{document.fileName}</b><small>{document.documentType} · {Math.ceil(document.fileSize / 1024)} KB</small></div><span className={document.verified ? "document-verified" : ""}>{document.verified ? t("dashboard.validated", "Verified").toUpperCase() : t("dashboard.pending", "Pending review").toUpperCase()}</span></div>) : <EmptyState text={t("vault.emptyTitle", "Your documents will appear here after upload.")} />}</div></section>
          <section className="app-panel marks-panel"><PanelHeading icon={Target} eyebrow={t("analysis.kicker", "02 / SUBJECT ANALYSIS")} title={t("dashboard.strengths", "Strengths, ranked honestly")} /><div className="mark-list">{profile.marks.length ? profile.marks.map((item) => <div className="mark-row" key={item.id}><span>{item.subject}<small>{item.category}</small></span><div><i><b style={{ width: `${item.score}%` }} /></i><strong>{item.score}%</strong></div><button type="button" className="mark-del" title={t("analysis.deleteMark", "Delete mark")} aria-label={t("analysis.deleteMark", "Delete mark")} onClick={() => deleteMark(item.id)}><Trash2 size={13} /></button></div>) : <EmptyState text={t("analysis.landscape", "Add your first subject score below.")} />}</div><form className="compact-form" onSubmit={addMark}><input placeholder={t("dashboard.subject", "Subject")} value={mark.subject} onChange={(event) => setMark({ ...mark, subject: event.target.value })} /><input placeholder={t("dashboard.category", "Category")} value={mark.category} onChange={(event) => setMark({ ...mark, category: event.target.value })} /><input type="number" min="0" max="100" placeholder={t("dashboard.score", "Score")} value={mark.score} onChange={(event) => setMark({ ...mark, score: event.target.value })} /><button className="icon-button" title={t("dashboard.addSubject", "Add subject")}><Plus size={16} /></button></form></section></div>
        <div className="profile-columns lower-profile-columns"><section className="app-panel guidance-panel"><PanelHeading icon={BrainCircuit} eyebrow={t("careers.kicker", "03 / CAREER GUIDANCE")} title={t("dashboard.paths", "Paths worth pursuing")} />{profile.guidance.paths.map((path) => <div className="path-row" key={path.title}><div><b>{path.title}</b><small>{t("careers.closeGaps", "Close these gaps to become opportunity-ready:")} {path.skills.join(" · ")}</small></div><strong>{path.match}%</strong></div>)}{!profile.guidance.paths.length && <EmptyState text={t("careers.buildHint", "Your career matches will appear after analysis.")} />}</section><section className="app-panel portfolio-panel"><PanelHeading icon={FolderKanban} eyebrow={t("portfolio.kicker", "04 / LIVE PORTFOLIO")} title={t("dashboard.proofOfWork", "Proof-of-work")} /><div className="portfolio-projects">{profile.projects.map((item) => <div className="project-row" key={item.id}><GraduationCap size={17} /><div><b>{item.title}</b><small>{item.skills.join(" · ")}</small></div></div>)}{!profile.projects.length && <EmptyState text={t("portfolio.emptyHint", "Add a project to make your profile recruiter-ready.")} />}</div><form className="project-form" onSubmit={addProject}><input placeholder={t("app.projectTitle", "Project title")} value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} /><input placeholder={t("app.skillsCsv", "Skills, comma separated")} value={project.skills} onChange={(event) => setProject({ ...project, skills: event.target.value })} /><textarea placeholder={t("app.whatDidYouBuild", "What did you build?")} value={project.description} onChange={(event) => setProject({ ...project, description: event.target.value })} /><button className="app-primary" type="submit">{t("app.addToPortfolio", "Add to portfolio")} <ArrowRight size={15} /></button></form></section></div>
        <footer className="app-footer"><span>{t("app.footerTag", "UPNEX / VERIFY · ANALYZE · NAVIGATE · SHARE")}</span><span>{t("app.footerPrivacy", "Private by default · controlled by you")}</span></footer></div></section>
    {showShare && profile.username && <ShareModal
      data={{
        name: profile.user?.name,
        username: profile.username,
        headline: profile.user?.headline,
        avatar: profile.user?.avatar,
        skills: profile.user?.skills || [],
        stats: {
          skills: Array.isArray(profile.user?.skills) ? profile.user.skills.length : 0,
          projects: profile.projects.length,
          credentials: profile.documents.filter((document) => document.verified).length
        }
      }}
      onClose={() => setShowShare(false)}
    />}
  </main>;
}

function WorkflowStep({ number, icon: Icon, title, text, active, path }) { const navigate = useNavigate(); return <button className={`workflow-step ${active ? "active" : ""}`} onClick={() => navigate(path)}><span>{number}</span><Icon size={19} /><div><b>{title}</b><small>{text}</small></div></button>; }
function PanelHeading({ icon: Icon, eyebrow, title }) { return <div className="panel-top profile-panel-heading"><div><span>{eyebrow}</span><h3>{title}</h3></div><Icon size={18} /></div>; }
function EmptyState({ text }) { return <div className="empty-state"><Users size={17} />{text}</div>; }
