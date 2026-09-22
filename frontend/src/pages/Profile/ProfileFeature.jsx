import { useState } from "react";
import { ArrowRight, AtSign, BadgeCheck, BrainCircuit, CalendarCheck, CheckCircle2, ExternalLink, FileDown, FolderKanban, Github, GraduationCap, Languages, LayoutDashboard, Linkedin, MapPin, Menu, Network, NotebookPen, Plus, Save, ScrollText, Search, Settings, Share2, ShieldCheck, Sparkles, Star, Target, Trash2, Users, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStudentProfile, emptyProfile } from "../../hooks/useStudentProfile";
import { useLanguage } from "../../context/LanguageContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import ThemeSwitcher from "../../components/ThemeSwitcher";
import NotificationBell from "../../components/NotificationBell";
import Vault from "./vault/Vault";
import SkillGraph from "../../components/profile/SkillGraph";
import ShareModal from "../../components/profile/ShareModal";
import CareerPassport from "../../components/profile/CareerPassport";
import PortfolioExport from "./PortfolioExport";
import StudyCoach from "./StudyCoach";
import { Mark } from "../../components/Logo";

const navigation = (t) => [
  [LayoutDashboard, t("nav.overview", "Overview"), "/dashboard"],
  [ShieldCheck, t("nav.vault", "Digital Vault"), "/profile/vault"],
  [Target, t("nav.analysis", "Subject Analysis"), "/profile/analysis"],
  [CalendarCheck, t("nav.studyCoach", "Smart Study"), "/profile/study"],
  [BrainCircuit, t("nav.careers", "Career Guidance"), "/profile/careers"],
  [FolderKanban, t("nav.portfolio", "Live Portfolio"), "/profile/portfolio"],
  [Network, t("nav.skillBridge", "Skill Bridge"), "/profile/skill-bridge"],
  [ScrollText, t("nav.passport", "Career Passport"), "/profile/passport"],
  [Settings, t("nav.settings", "Settings"), "/profile/settings"]
];

const heroNs = { vault: "vault", analysis: "analysis", study: "studyCoach", careers: "careers", portfolio: "portfolio", "skill-bridge": "skillBridge", passport: "passport", settings: "settings" };

export default function ProfileFeature({ type }) {
  const location = useLocation();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const {
    profile,
    message,
    setMessage,
    mark,
    setMark,
    project,
    setProject,
    identity,
    setIdentity,
    details,
    setDetails,
    addDocument: uploadDocument,
    addMark,
    addProject,
    saveIdentity,
    saveDetails,
    saveUsername,
    saveProject,
    deleteProject,
    loadProfile
  } = useStudentProfile({
    initialProfile: emptyProfile,
    documentSuccessMessage: "Document added to your vault - pending review."
  });

  return <main className="main-app">
    <aside className={`app-sidebar ${open ? "open" : ""}`}><div className="app-brand"><Mark /><div><b>UPNEX</b><small>{t("nav.smartEducation", "SMART EDUCATION")}</small></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="sidebar-label">{t("nav.studentProfile", "STUDENT PROFILE")}</div><nav>{navigation(t).map(([Icon, name, path]) => <Link key={name} className={location.pathname === path ? "active" : ""} to={path} onClick={() => setOpen(false)}><Icon size={18} /><span>{name}</span>{location.pathname === path && <i />}</Link>)}</nav><div className="sidebar-bottom"><Link to="/"><ArrowRight size={18} /> {t("nav.backToUpnex", "Back to UPNEX")}</Link></div></aside>
    <section className="app-content"><header className="app-header"><button className="mobile-menu" onClick={() => setOpen(true)}><Menu size={21} /></button><div className="app-search"><Search size={17} /><input placeholder={t("nav.searchPlaceholder", "Search your profile...")} /></div><div className="header-actions">{profile.username && <><a className="public-chip" href={`/${profile.username}`}><ExternalLink size={13} /> upnex.ai/{profile.username}</a><button className="share-chiplike" onClick={() => setShowShare(true)}><Share2 size={13} /> {t("nav.share", "Share")}</button><Link className="share-chiplike" to="/profile/export"><FileDown size={13} /> {t("nav.export", "Export PDF")}</Link></>}<NotificationBell /><LanguageSwitcher /><ThemeSwitcher /><div className="user-chip"><span>ST</span><div><b>{t("nav.studentLabel", "Student")}</b><small>{t("nav.studentProfileShort", "Student profile")}</small></div></div></div></header>
      <div className="app-body feature-body">{(type !== "export") && <div className="feature-hero"><div><div className="mini-kicker"><span /> {t(`${heroNs[type]}.kicker`)}</div><h1>{t(`${heroNs[type]}.titleLine`)}</h1><p>{t(`${heroNs[type]}.subtitle`)}</p></div><div className="feature-score"><Sparkles size={17} /><strong>{profile.readiness}</strong><span>{t("nav.readiness", "readiness")}</span></div></div>}{message && <div className="profile-message"><CheckCircle2 size={16} /> {message}</div>}
        {type === "export" && <PortfolioExport profile={profile} />}
        {type === "vault" && <Vault profile={profile} uploadDocument={uploadDocument} loadProfile={loadProfile} />}
        {type === "analysis" && <Analysis profile={profile} mark={mark} setMark={setMark} addMark={addMark} />}
        {type === "study" && <StudyCoach profile={profile} />}
        {type === "careers" && <Careers profile={profile} />}
        {type === "portfolio" && <PortfolioProfile profile={profile} identity={identity} setIdentity={setIdentity} saveIdentity={saveIdentity} project={project} setProject={setProject} addProject={addProject} />}
        {type === "skill-bridge" && <SkillBridge profile={profile} />}
        {type === "passport" && <CareerPassport profile={profile} />}
        {type === "settings" && <SettingsPage details={details} setDetails={setDetails} saveDetails={saveDetails} saveUsername={saveUsername} profile={profile} saveProject={saveProject} deleteProject={deleteProject} />}
        {(showShare && profile.username) && <ShareModal
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
        <footer className="app-footer"><span>{t("app.footerTag", "UPNEX / VERIFY - ANALYZE - NAVIGATE - SHARE")}</span><span>{t("app.footerPrivacy", "Private by default - controlled by you")}</span></footer>
      </div>
    </section>
  </main>;
}

function PanelHeading({ icon: Icon, eyebrow, title }) { return <div className="panel-top profile-panel-heading"><div><span>{eyebrow}</span><h3>{title}</h3></div><Icon size={18} /></div>; }
function EmptyState({ text }) { return <div className="empty-state"><Users size={17} />{text}</div>; }

function Analysis({ profile, mark, setMark, addMark }) { const { t } = useTranslation(); const average = profile.guidance.average || 0; return <><div className="analysis-overview"><div className="app-panel"><span className="feature-eyebrow">{t("analysis.academicPulse", "ACADEMIC PULSE")}</span><strong className="big-number">{average}%</strong><p>{t("analysis.averageAcross", "average across {{count}} tracked subjects", { count: profile.marks.length })}</p></div><div className="app-panel"><span className="feature-eyebrow">{t("analysis.strongestSignal", "STRONGEST SIGNAL")}</span><strong className="big-label">{profile.guidance.strongest || t("analysis.firstMark", "Add your first mark")}</strong><p>{t("analysis.strongestHint", "the category showing the most momentum")}</p></div></div><div className="feature-grid feature-analysis"><section className="app-panel feature-main-panel"><PanelHeading icon={Target} eyebrow={t("analysis.rankedLowHigh", "RANKED FROM LOW TO HIGH")} title={t("analysis.landscape", "Your subject landscape")} />{profile.marks.length ? profile.marks.map((item) => <div className="mark-row" key={item.id}><span>{item.subject}<small>{item.category}</small></span><div><i><b style={{ width: `${item.score}%` }} /></i><strong>{item.score}%</strong></div></div>) : <EmptyState text={t("analysis.emptyHint", "Add scores to reveal your subject landscape.")} />}</section><section className="app-panel feature-side-panel"><PanelHeading icon={Plus} eyebrow={t("analysis.addSignal", "ADD A SIGNAL")} title={t("analysis.trackSubject", "Track a subject")} /><form className="stack-form" onSubmit={addMark}><input placeholder={t("dashboard.subject", "Subject")} value={mark.subject} onChange={(event) => setMark({ ...mark, subject: event.target.value })} /><input placeholder={t("analysis.categoryPlaceholder", "Category e.g. Core")} value={mark.category} onChange={(event) => setMark({ ...mark, category: event.target.value })} /><input type="number" min="0" max="100" placeholder={t("analysis.scoreOutOf", "Score out of 100")} value={mark.score} onChange={(event) => setMark({ ...mark, score: event.target.value })} /><button className="app-primary" type="submit">{t("analysis.saveScore", "Save score")} <ArrowRight size={15} /></button></form></section></div></>; }

function Careers({ profile }) { const { t } = useTranslation(); return <><section className="career-banner"><div><span>{t("careers.roleTitle", "AI ENHANCEMENT COORDINATOR")}</span><h2>{profile.guidance.strongest ? t("careers.strongestSignal", "Your strongest signal is {{role}}.", { role: profile.guidance.strongest }) : t("careers.emptyTitle", "Your next path starts with your data.")}</h2><p>{t("careers.subtitle", "Career matches built from your actual marks and proof-of-work.")}</p></div><div className="command-score"><Sparkles size={18} /><strong>{profile.readiness}%</strong><small>{t("careers.readyToday", "ready today")}</small></div></section><div className="career-list">{profile.guidance.paths.length ? profile.guidance.paths.map((path, index) => <article className={`career-card ${index === 0 ? "recommended" : ""}`} key={path.title}><div className="career-rank">0{index + 1}</div><div className="career-card-content"><span>{index === 0 ? t("careers.recommendedNext", "RECOMMENDED NEXT") : t("careers.possibleDirection", "POSSIBLE DIRECTION")}</span><h3>{path.title}</h3><p>{t("careers.closeGaps", "Close these gaps to become opportunity-ready:")}</p><div className="skill-chips">{path.skills.map((skill) => <b key={skill}>{skill}</b>)}</div></div><strong className="career-match">{path.match}%<small>{t("dashboard.topMatch", "match")}</small></strong></article>) : <div className="app-panel"><EmptyState text={t("careers.buildHint", "Add marks and projects to generate career matches.")} /></div>}</div></>; }

function SkillBridge({ profile }) {
  const { t } = useTranslation();
  return <div className="feature-grid feature-skillbridge">
    <section className="app-panel feature-main-panel">
      <SkillGraph
        skills={profile.intelligence || []}
        title={t("skillBridge.graphTitle", "YOUR SKILL EVIDENCE MAP")}
        subtitle={t("skillBridge.graphSub", "Your declared skills, linked to the projects, repos and credentials that prove them.")}
      />
    </section>
    <aside className="app-panel feature-side-panel">
      <span className="feature-eyebrow">{t("skillBridge.tipsEyebrow", "HOW TO GROW IT")}</span>
      <h3>{t("skillBridge.tipsTitle", "Every lit edge is proof.")}</h3>
      <p>{t("skillBridge.tipsBody", "Skills without linked evidence stay dark. Add a project, connect a GitHub repo, or verify a credential that mentions the skill to light that skill up.")}</p>
      <p className="settings-muted">{t("skillBridge.autoHint", "UPNEX links evidence automatically when a project or credential mentions the skill.")}</p>
    </aside>
  </div>;
}

function Portfolio({ profile, project, setProject, addProject }) { return <><section className="portfolio-banner"><div><span>PUBLIC PROFILE PREVIEW</span><h2>Student / UPNEX profile</h2><p>Verified evidence, visible progress and proof-of-work in one link.</p></div><button className="app-secondary"><ExternalLink size={15} /> Preview share page</button></section><div className="feature-grid feature-portfolio"><section className="app-panel feature-main-panel"><PanelHeading icon={FolderKanban} eyebrow="PROOF-OF-WORK" title={`${profile.projects.length} projects published`} />{profile.projects.length ? profile.projects.map((item) => <article className="portfolio-card" key={item.id}><div className="project-symbol"><FolderKanban size={20} /></div><div><h3>{item.title}</h3><p>{item.description}</p><div className="skill-chips">{item.skills.map((skill) => <b key={skill}>{skill}</b>)}</div></div><ArrowRight size={17} /></article>) : <EmptyState text="Your projects will become recruiter-ready cards here." />}</section><section className="app-panel feature-side-panel"><PanelHeading icon={Plus} eyebrow="ADD PROJECT" title="Show what you built" /><form className="stack-form" onSubmit={addProject}><input placeholder="Project title" value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} /><input placeholder="Skills, comma separated" value={project.skills} onChange={(event) => setProject({ ...project, skills: event.target.value })} /><textarea placeholder="What did you build?" value={project.description} onChange={(event) => setProject({ ...project, description: event.target.value })} /><button className="app-primary" type="submit">Publish project <ArrowRight size={15} /></button></form></section></div></>;
}

function PortfolioProfile({ profile, identity, setIdentity, saveIdentity, project, setProject, addProject }) { const { t } = useTranslation(); return <><section className="portfolio-banner"><div><span>{t("portfolio.publicPreview", "PUBLIC PROFILE PREVIEW")}</span><h2>{t("portfolio.profileTitle", "{{name}} / UPNEX profile", { name: identity.name || t("nav.studentLabel", "Student") })}</h2><p>{t("portfolio.publicSub", "Verified evidence, visible progress and proof-of-work in one link.")}</p></div><div className="portfolio-links">{identity.githubUrl && <a href={identity.githubUrl} target="_blank" rel="noreferrer"><Github size={15} /> GitHub</a>}{identity.linkedinUrl && <a href={identity.linkedinUrl} target="_blank" rel="noreferrer"><Linkedin size={15} /> LinkedIn</a>}</div></section><section className="app-panel identity-panel"><PanelHeading icon={Users} eyebrow={t("portfolio.identityTitle", "STUDENT IDENTITY")} title={t("portfolio.identitySub", "Your public profile details")} /><form className="identity-form" onSubmit={saveIdentity}><label>{t("portfolio.nameLabel", "Student name")}<input required minLength="2" maxLength="80" value={identity.name} onChange={(event) => setIdentity({ ...identity, name: event.target.value })} placeholder={t("auth.fullNamePlaceholder", "Your full name")} /></label><label><Github size={14} /> {t("portfolio.githubLabel", "GitHub profile URL")}<input type="url" value={identity.githubUrl} onChange={(event) => setIdentity({ ...identity, githubUrl: event.target.value })} placeholder="https://github.com/your-username" /></label><label><Linkedin size={14} /> {t("portfolio.linkedinLabel", "LinkedIn profile URL")}<input type="url" value={identity.linkedinUrl} onChange={(event) => setIdentity({ ...identity, linkedinUrl: event.target.value })} placeholder="https://www.linkedin.com/in/your-name" /></label><button className="app-primary" type="submit">{t("portfolio.saveProfile", "Save profile")} <CheckCircle2 size={15} /></button></form></section><div className="feature-grid feature-portfolio"><section className="app-panel feature-main-panel"><PanelHeading icon={FolderKanban} eyebrow={t("portfolio.proofTitle", "PROOF-OF-WORK")} title={t("portfolio.projectsPublished", "{{count}} projects published", { count: profile.projects.length })} />{profile.projects.length ? profile.projects.map((item) => <article className="portfolio-card" key={item.id}><div className="project-symbol"><FolderKanban size={20} /></div><div><h3>{item.title}</h3><p>{item.description}</p><div className="skill-chips">{item.skills.map((skill) => <b key={skill}>{skill}</b>)}</div></div><ArrowRight size={17} /></article>) : <EmptyState text={t("portfolio.emptyHint", "Add a project to make your profile recruiter-ready.")} />}</section><section className="app-panel feature-side-panel"><PanelHeading icon={Plus} eyebrow={t("portfolio.addProject", "ADD PROJECT")} title={t("portfolio.showWhatYouBuilt", "Show what you built")} /><form className="stack-form" onSubmit={addProject}><input placeholder={t("app.projectTitle", "Project title")} value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} /><input placeholder={t("app.skillsCsv", "Skills, comma separated")} value={project.skills} onChange={(event) => setProject({ ...project, skills: event.target.value })} /><textarea placeholder={t("app.whatDidYouBuild", "What did you build?")} value={project.description} onChange={(event) => setProject({ ...project, description: event.target.value })} /><button className="app-primary" type="submit">{t("portfolio.publishProject", "Publish project")} <ArrowRight size={15} /></button></form></section></div></>; }


function SettingsPage({ details, setDetails, saveDetails, saveUsername, profile, saveProject, deleteProject }) {
  const { t } = useTranslation();
  const { language, setLanguage, languages } = useLanguage();
  const entries = Object.values(languages);
  return <><div className="feature-grid feature-settings"><section className="app-panel feature-main-panel"><PanelHeading icon={Languages} eyebrow={t("settings.kicker", "05 / SETTINGS")} title={t("settings.langRegion", "Language & Region")} /><div className="lang-grid">{entries.map(({ code, label, native }) => <button type="button" key={code} className={code === language ? "lang-option active" : "lang-option"} onClick={() => setLanguage(code)}><span className="lang-option-native">{native}</span><span className="lang-option-label">{label}</span>{code === language && <CheckCircle2 size={16} />}</button>)}</div></section><aside className="app-panel feature-side-panel"><span className="feature-eyebrow">{t("settings.regionalMode", "Regional Language Mode")}</span><h3>{t("settings.titleLine", "Make UPNEX yours.")}</h3><p>{t("settings.regionalModeHint", "Navigation, explanations and recommendations stay in your chosen Indian language. Technical terms remain in English.")}</p><p className="settings-muted">{t("settings.interfaceLangHelp", "Every label, menu and message follows the language you pick here. Your choice is saved to your account automatically.")}</p></aside></div><ProfileEditor details={details} setDetails={setDetails} saveDetails={saveDetails} saveUsername={saveUsername} profile={profile} saveProject={saveProject} deleteProject={deleteProject} /></>; }

const UPNEX_AVAILABILITY = [
  { value: "Open to Internships", label: "Open to internships" },
  { value: "Open to Jobs", label: "Open to jobs" },
  { value: "Open to Freelance", label: "Open to freelance" },
  { value: "Open to Collaborations", label: "Open to collaborations" },
  { value: "Available for Opportunities", label: "Available for opportunities" },
  { value: "Not Currently Available", label: "Not currently available" }
];
const UPNEX_PRIVACY_FIELDS = ["profile", "academics", "credentials", "activity"];
const UPNEX_PRIVACY_OPTIONS = ["public", "connections", "private"];
const UPNEX_SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const UPNEX_PROJECT_STATUS = ["draft", "in-progress", "published", "archived"];

function ProfileEditor({ details, setDetails, saveDetails, saveUsername, profile, saveProject, deleteProject }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(profile.username || "");
  const [usernameMsg, setUsernameMsg] = useState(null);
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState("intermediate");
  const [edu, setEdu] = useState({ degree: "", institution: "", startYear: "", endYear: "", grade: "" });
  const privacy = details.privacy || { profile: "public", academics: "public", credentials: "public", activity: "private" };
  const skills = Array.isArray(details.skills) ? details.skills : [];
  const education = Array.isArray(details.education) ? details.education : [];
  const set = (key, value) => setDetails((d) => ({ ...d, [key]: value }));

  const submitUsername = async (event) => {
    event.preventDefault();
    const result = await saveUsername(username.trim());
    if (result.ok) setUsername(result.username);
    setUsernameMsg(result.ok ? { ok: true, text: t("settings.usernameLive", "Username is live at upnex.ai/{{username}}", { username: result.username }) } : { ok: false, text: result.message || t("settings.usernameFailed", "Could not update username.") });
  };

  const addSkill = (event) => {
    event.preventDefault();
    const name = skillName.trim();
    if (!name || skills.some((s) => String(s.name).toLowerCase() === name.toLowerCase())) return;
    set("skills", [...skills, { name, level: skillLevel }]);
    setSkillName("");
  };

  const addEducation = (event) => {
    event.preventDefault();
    if (!edu.degree.trim() && !edu.institution.trim()) return;
    set("education", [...education, { ...edu, startYear: edu.startYear || "", endYear: edu.endYear || "", grade: edu.grade || "" }]);
    setEdu({ degree: "", institution: "", startYear: "", endYear: "", grade: "" });
  };

  return <div className="pe-stack">
    <section className="app-panel pe-panel">
      <PanelHeading icon={AtSign} eyebrow="01 / MEMBERSHIP" title="Your public web address" />
      <p className="settings-muted">A stable, human-readable link for your public profile. You can change it later - old links keep working.</p>
      <form className="pe-inline-form" onSubmit={submitUsername}>
        <span className="pe-prefix">upnex.ai/</span>
        <input value={username} onChange={(e) => setUsername(e.target.value)} pattern="[a-zA-Z0-9_-]{3,30}" required placeholder="your-name" />
        <button className="app-primary" type="submit"><Save size={15} /> {t("settings.saveUsername", "Make live")}</button>
      </form>
      {usernameMsg && <p className={usernameMsg.ok ? "pe-hint ok" : "pe-hint err"}>{usernameMsg.text}</p>}
    </section>

    <form className="app-panel pe-panel" onSubmit={saveDetails}>
      <PanelHeading icon={BadgeCheck} eyebrow="02 / PUBLIC PROFILE" title="The story recruiters see first" />
      <div className="pe-grid">
        <label>Full name<input required minLength="2" maxLength="80" value={details.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Jane Student" /></label>
        <label>Headline<input maxLength="120" value={details.headline || ""} onChange={(e) => set("headline", e.target.value)} placeholder="BTech CSE - Full-stack developer - Class of 2027" /></label>
        <label><MapPin size={14} /> Location<input maxLength="100" value={details.location || ""} onChange={(e) => set("location", e.target.value)} placeholder="Chennai, India" /></label>
        <label>Availability<select value={details.availability || ""} onChange={(e) => set("availability", e.target.value)}>
          <option value="">Prefer not to say</option>
          {UPNEX_AVAILABILITY.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select></label>
        <label><Github size={14} /> GitHub profile URL<input type="url" value={details.githubUrl || ""} onChange={(e) => set("githubUrl", e.target.value)} placeholder="https://github.com/jane" /></label>
        <label><Linkedin size={14} /> LinkedIn profile URL<input type="url" value={details.linkedinUrl || ""} onChange={(e) => set("linkedinUrl", e.target.value)} placeholder="https://www.linkedin.com/in/jane" /></label>
        <label className="pe-full">Cover image URL<input type="url" value={details.coverUrl || ""} onChange={(e) => set("coverUrl", e.target.value)} placeholder="https://... (optional banner for your public profile)" /></label>
        <label className="pe-full">Bio<textarea rows="3" maxLength="600" value={details.bio || ""} onChange={(e) => set("bio", e.target.value)} placeholder="What do you build, learn and care about?" /></label>
      </div>
      <label className="pe-check"><input type="checkbox" checked={details.profilePublic !== false} onChange={(e) => set("profilePublic", e.target.checked)} /><span><b>Profile visible to everyone</b><small>Turn off to hide your public page until you are ready to share it.</small></span></label>
      <footer className="pe-actions"><button className="app-primary" type="submit"><Save size={15} /> {t("portfolio.saveProfile", "Save profile")}</button>{profile.username && <a className="pe-preview" href={`/${profile.username}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Preview upnex.ai/{profile.username}</a>}</footer>
    </form>

    <section className="app-panel pe-panel">
      <PanelHeading icon={ShieldCheck} eyebrow="03 / PRIVACY" title="Who can see what" />
      <div className="pe-privacy">
        {UPNEX_PRIVACY_FIELDS.map((field) => <label key={field}><span className="pe-privacy-label"><b>{field}</b><small>controls the {field} section of your public page</small></span>
          <select value={privacy[field] || "public"} onChange={(e) => set("privacy", { ...privacy, [field]: e.target.value })}>
            {UPNEX_PRIVACY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select></label>)}
      </div>
    </section>

    <section className="app-panel pe-panel">
      <PanelHeading icon={Star} eyebrow="04 / SKILLS" title="Skills & proficiencies" />
      {skills.length ? <div className="pe-chips">{skills.map((s, i) => <span className="pe-chip" key={`${s.name}-${i}`}>{s.name}<small>{s.level || "general"}</small><button type="button" onClick={() => set("skills", skills.filter((_, j) => j !== i))}><Trash2 size={13} /></button></span>)}</div> : <p className="settings-muted">No skills yet - add the first one below.</p>}
      <form className="pe-inline-form" onSubmit={addSkill}>
        <input value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="e.g. React, C, Design Thinking" />
        <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}>{UPNEX_SKILL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select>
        <button className="app-secondary" type="submit"><Plus size={15} /> Add skill</button>
      </form>
    </section>

    <section className="app-panel pe-panel">
      <PanelHeading icon={GraduationCap} eyebrow="05 / EDUCATION" title="Education history" />
      {education.length ? <div className="pe-edu-list">{education.map((entry, i) => <article className="pe-edu-row" key={i}><div><b>{entry.degree || "Study"}</b><span>{entry.institution}{entry.startYear && ` / ${entry.startYear}${entry.endYear ? `-${entry.endYear}` : ""}`}{entry.grade && ` / ${entry.grade}`}</span></div><button type="button" onClick={() => set("education", education.filter((_, j) => j !== i))}><Trash2 size={14} /></button></article>)}</div> : <p className="settings-muted">Add your school, college or degree.</p>}
      <div className="pe-edu-form">
        <input value={edu.degree} onChange={(e) => setEdu({ ...edu, degree: e.target.value })} placeholder="Degree, e.g. BTech in Computer Science" />
        <input value={edu.institution} onChange={(e) => setEdu({ ...edu, institution: e.target.value })} placeholder="Institution" />
        <input value={edu.startYear} onChange={(e) => setEdu({ ...edu, startYear: e.target.value })} placeholder="Start year" />
        <input value={edu.endYear} onChange={(e) => setEdu({ ...edu, endYear: e.target.value })} placeholder="End year" />
        <input value={edu.grade} onChange={(e) => setEdu({ ...edu, grade: e.target.value })} placeholder="Grade / CGPA" />
        <button className="app-secondary" type="button" onClick={addEducation}><Plus size={15} /> Add</button>
      </div>
    </section>

    <section className="app-panel pe-panel">
      <PanelHeading icon={FolderKanban} eyebrow="06 / PROJECTS" title="Curate your proof-of-work" />
      {profile.projects.length ? <div className="pe-project-list">{profile.projects.map((item) => <article className="pe-project-row" key={item.id}><div><b>{item.title}</b><span>{item.status || "draft"} / {Array.isArray(item.skills) ? item.skills.join(", ") : ""}</span></div><div className="pe-row-actions">
        <button type="button" className={item.featured ? "pe-star on" : "pe-star"} onClick={() => saveProject(item.id, { featured: !item.featured })}><Star size={14} /> {item.featured ? "Featured" : "Feature"}</button>
        <select value={item.status || "draft"} onChange={(e) => saveProject(item.id, { status: e.target.value })}>{UPNEX_PROJECT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <button type="button" className="pe-icon danger" onClick={() => deleteProject(item.id)}><Trash2 size={15} /></button>
      </div></article>)}</div> : <p className="settings-muted">No projects yet - add them from the Live Portfolio tab.</p>}
    </section>
  </div>;
}