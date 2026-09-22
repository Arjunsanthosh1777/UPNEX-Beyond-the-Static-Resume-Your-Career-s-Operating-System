import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Award,
  BadgeCheck,
  Check,
  Copy,
  ExternalLink,
  FolderGit2,
  Github,
  GraduationCap,
  Linkedin,
  MapPin,
  Minus,
  Share2,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  X
} from "lucide-react";
import NotFound from "../NotFound/NotFound";
import api from "../../services/api";
import SkillGraph from "../../components/profile/SkillGraph";
import ShareModal from "../../components/profile/ShareModal";
import ProofPreview from "../../components/profile/ProofPreview";
import { ScreenLoader } from "../../components/Loading";

// Mirrors the backend contract (utils/username.js): lowercase [a-z0-9_-],
// 3-24 chars. Anything else short-circuits to the 404 page without a request.
const USERNAME_PATTERN = /^[a-z0-9_][a-z0-9_-]*$/;

// Client-side mirror of the backend reserved list: static app routes and
// system words must never resolve to a user profile.
const RESERVED_USERNAMES = new Set([
  "login", "register", "signin", "signup", "auth", "logout",
  "dashboard", "settings", "search", "explore", "notifications",
  "profile", "u", "user", "users", "account", "accounts",
  "api", "api-docs", "health", "status", "admin", "mod", "moderator",
  "about", "terms", "privacy", "legal", "help", "support", "contact",
  "home", "feed", "me", "my", "new", "edit", "create", "delete", "upload",
  "favicon", "favicon.ico", "robots.txt", "sitemap.xml", "manifest.json",
  "assets", "static", "images", "css", "js", "public", "src", "dist", ".env"
]);

function isValidUsername(value) {
  return USERNAME_PATTERN.test(value) && !RESERVED_USERNAMES.has(value);
}

/* eslint-disable react/prop-types */

const TREND_ICON = { improving: TrendingUp, declining: TrendingDown, steady: Minus };

function Stat({ value, label }) {
  return (
    <div className="pp-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProjectCard({ project }) {
  return (
    <article className="pp-project">
      {project.thumbnailUrl && (
        <img className="pp-project-thumb" src={project.thumbnailUrl} alt="" loading="lazy" />
      )}
      <div className="pp-project-head">
        <h3>{project.title}</h3>
        {project.featured && <Star className="pp-star" size={15} aria-label="Featured" />}
      </div>
      <p>{project.description}</p>
      {Array.isArray(project.skills) && project.skills.length > 0 && (
        <div className="pp-skills">
          {project.skills.map((skill) => <span key={skill}>{skill}</span>)}
        </div>
      )}
      <div className="pp-project-links">
        {project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer noopener">Live demo</a>}
        {project.repoUrl && <a href={project.repoUrl} target="_blank" rel="noreferrer noopener">Code</a>}
      </div>
    </article>
  );
}

function ProofModal({ document, onClose }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const link = `${window.location.origin}/verify/${document.verificationId}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }).catch(() => {});
    }
  }

  return (
    <div className="proof-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="proof-modal-inner" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="proof-modal-close" onClick={onClose} aria-label={t("common.close", "Close")}><X size={18} /></button>
        <ProofPreview document={document} />
        {document.verificationId && (
          <div className="proof-actions">
            <button type="button" className={copied ? "proof-act ok" : "proof-act primary"} onClick={copyLink}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? t("proof.copied", "Copied!") : t("proof.copyLink", "Copy verify link")}
            </button>
            <Link className="proof-act" to={`/verify/${document.verificationId}`} onClick={onClose}>
              <ExternalLink size={14} /> {t("proof.openPage", "Open verify page")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileCard({ data }) {
  const { t } = useTranslation();
  const [showShare, setShowShare] = useState(false);
  const [proofDoc, setProofDoc] = useState(null);
  const { profile, sections = {}, stats = {}, projects = [], featured = [], skills = [], education = [], academics, credentials = [] } = data;

  const TrendIcon = academics ? (TREND_ICON[academics.trend] || Minus) : Minus;

  // Only surface metrics that actually exist — no empty "0" cards.
  const metricCards = [
    { key: "projects", value: stats.projects, label: t("publicProfile.projects", "Projects") },
    { key: "skills", value: stats.skills, label: t("publicProfile.skills", "Skills") },
    { key: "credentials", value: stats.credentials, label: t("publicProfile.credentials", "Credentials") },
    { key: "subjects", value: stats.subjects, label: t("publicProfile.subjects", "Subjects") }
  ].filter((card) => Number(card.value) > 0);

  const topProjects = featured.length ? featured : projects.slice(0, 2);

  return (
    <main className="public-profile">
      <div className="pp-cover" style={profile.coverUrl ? { backgroundImage: `url(${profile.coverUrl})` } : undefined} />

      <div className="pp-hero">
        <div className="pp-avatar-wrap">
          {profile.avatar ? (
            <img className="pp-avatar" src={profile.avatar} alt={profile.name} />
          ) : (
            <div className="pp-avatar pp-avatar-fallback">{profile.name.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className="pp-hero-body">
          <div className="pp-name-row">
            <h1>{profile.name}</h1>
            {profile.verified && (
              <span className="pp-verified" title={t("publicProfile.verifiedAccount", "Verified account")}>
                <BadgeCheck size={18} />
              </span>
            )}
          </div>
          <p className="pp-handle">@{profile.username}</p>
          {profile.headline && <p className="pp-headline">{profile.headline}</p>}
          {profile.bio && <p className="pp-bio">{profile.bio}</p>}

          <div className="pp-meta">
            {profile.availability && <span className="pp-pill pp-pill-open">{profile.availability}</span>}
            {profile.location && (
              <span className="pp-meta-item"><MapPin size={14} /> {profile.location}</span>
            )}
            <span className="pp-joined">
              {t("publicProfile.joined", "Joined")}{" "}
              {new Date(profile.joined).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
          </div>

          {(profile.githubUrl || profile.linkedinUrl) && (
            <div className="pp-links">
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noreferrer noopener"><Github size={15} /> GitHub</a>
              )}
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noreferrer noopener"><Linkedin size={15} /> LinkedIn</a>
              )}
            </div>
          )}
          <button type="button" className="pp-share" onClick={() => setShowShare(true)}>
            <Share2 size={14} /> {t("publicProfile.shareProfile", "Share profile")}
          </button>
        </div>
      </div>

      {metricCards.length > 0 && (
        <div className={`pp-stats pp-stats-${Math.min(metricCards.length, 4)}`}>
          {metricCards.map((card) => <Stat key={card.key} value={card.value} label={card.label} />)}
        </div>
      )}

      {topProjects.length > 0 && (
        <section className="pp-block">
          <h2><Sparkles size={16} /> {t("publicProfile.featured", "Featured work")}</h2>
          <div className="pp-projects">
            {topProjects.map((project) => <ProjectCard key={project.title} project={project} />)}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="pp-block">
          <h2><Award size={16} /> {t("publicProfile.skills", "Skills")}</h2>
          <div className="pp-skill-grid">
            {skills.map((skill) => (
              <div className="pp-skill" key={skill.name}>
                <div className="pp-skill-top">
                  <strong>{skill.name}</strong>
                  {skill.level && <span className="pp-skill-level">{skill.level}</span>}
                </div>
                {skill.evidenceCount > 0 && (
                  <span className="pp-skill-evidence">
                    <FolderGit2 size={12} /> {skill.evidenceCount} {t("publicProfile.projects", "projects")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="pp-block">
          <h2><BadgeCheck size={16} /> {t("publicProfile.skillGraph", "Skill evidence map")}</h2>
          <SkillGraph skills={skills} credentials={credentials} />
        </section>
      )}

      {sections.academics && academics && (
        <section className="pp-block">
          <h2><GraduationCap size={16} /> {t("publicProfile.academics", "Academic snapshot")}</h2>
          <div className="pp-academics">
            <div className="pp-acad-score">
              <strong>{academics.average}%</strong>
              <span>{t("publicProfile.average", "Average")}</span>
            </div>
            <div className="pp-acad-score">
              <strong>{academics.cgpa}</strong>
              <span>{t("publicProfile.cgpa", "CGPA / 10")}</span>
            </div>
            <div className="pp-acad-score">
              <strong className={`pp-trend pp-trend-${academics.trend}`}><TrendIcon size={20} /> {academics.trend}</strong>
              <span>{t("publicProfile.trend", "Trend")}</span>
            </div>
          </div>
          {academics.strongAreas?.length > 0 && (
            <div className="pp-acad-lists">
              <div>
                <h3>{t("publicProfile.strongAreas", "Strong areas")}</h3>
                <div className="pp-skills">
                  {academics.strongAreas.map((area) => <span key={area}>{area}</span>)}
                </div>
              </div>
              {academics.improvementAreas?.length > 0 && (
                <div>
                  <h3>{t("publicProfile.focusAreas", "Focus areas")}</h3>
                  <div className="pp-skills pp-skills-muted">
                    {academics.improvementAreas.map((area) => <span key={area}>{area}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {projects.length > 0 && (
        <section className="pp-block">
          <h2><FolderGit2 size={16} /> {t("publicProfile.projects", "Projects")}</h2>
          <div className="pp-projects">
            {projects.map((project) => <ProjectCard key={`all-${project.title}`} project={project} />)}
          </div>
        </section>
      )}

      {sections.credentials && credentials.length > 0 && (
        <section className="pp-block">
          <h2><BadgeCheck size={16} /> {t("publicProfile.credentials", "Verified credentials")}</h2>
          <ul className="pp-docs">
            {credentials.map((doc) => (
              <li key={doc.verificationId} className="pp-doc" role="button" tabIndex={0} onClick={() => setProofDoc(doc)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setProofDoc(doc); } }}>
                <span className="pp-doc-type">{doc.type}</span>
                <span className="pp-doc-title">{doc.title}</span>
                {doc.issuer && <span className="pp-doc-issuer">{doc.issuer}</span>}
                <code className="pp-doc-id">{doc.verificationId}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      {education.length > 0 && (
        <section className="pp-block">
          <h2><GraduationCap size={16} /> {t("publicProfile.education", "Education")}</h2>
          <ul className="pp-timeline">
            {education.map((entry, index) => (
              <li key={`${entry.degree}-${index}`}>
                <strong>{entry.degree}</strong>
                <span>{entry.institution}</span>
                {(entry.startYear || entry.endYear) && (
                  <em>{[entry.startYear, entry.endYear].filter(Boolean).join(" – ")}</em>
                )}
                {entry.grade && <span className="pp-grade">{entry.grade}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="pp-foot">
        <Link to="/">← {t("publicProfile.backToUpnex", "Back to UPNEX")}</Link>
      </p>

      {showShare && (
        <ShareModal
          data={{
            name: profile.name,
            username: profile.username,
            headline: profile.headline,
            avatar: profile.avatar,
            skills: skills || [],
            stats: {
              skills: Number(stats.skills) || 0,
              projects: Number(stats.projects) || 0,
              credentials: Number(stats.credentials) || 0
            }
          }}
          onClose={() => setShowShare(false)}
        />
      )}
      {proofDoc && <ProofModal document={proofDoc} onClose={() => setProofDoc(null)} />}
    </main>
  );
}

export default function PublicProfile() {
  const { t } = useTranslation();
  const { username } = useParams();
  const [state, setState] = useState({ phase: "loading", data: null });

  useEffect(() => {
    const normalized = String(username || "").trim().toLowerCase();

    if (!isValidUsername(normalized)) {
      setState({ phase: "missing", data: null });
      return;
    }

    let cancelled = false;
    setState({ phase: "loading", data: null });

    api
      .get(`/public/${encodeURIComponent(normalized)}`)
      .then((res) => {
        if (!cancelled) setState({ phase: "ready", data: res.data });
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 covers both "no such user" at the API and our reserved-guard.
        if (err.response?.status === 404) setState({ phase: "missing", data: null });
        else setState({ phase: "error", data: null });
      });

    return () => { cancelled = true; };
  }, [username]);

  if (state.phase === "missing") return <NotFound />;

  if (state.phase === "error") {
    return (
      <div className="not-found">
        <div className="nf-code">!</div>
        <h1>{t("publicProfile.loadFailed", "Couldn't load this profile.")}</h1>
        <p>{t("publicProfile.serverTrouble", "UPNEX is having trouble reaching its servers. Please try again in a moment.")}</p>
        <Link className="nf-home" to="/">{t("common.backToUpnex", "Back to UPNEX")}</Link>
      </div>
    );
  }

  if (state.phase === "loading") {
    return <ScreenLoader label={t("common.loading", "LOADING…")} />;
  }

  return <ProfileCard data={state.data} />;
}
