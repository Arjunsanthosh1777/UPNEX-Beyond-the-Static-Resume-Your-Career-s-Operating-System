import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Mark } from "../../components/Logo";

const LEVEL_VALUE = { Expert: 4, Advanced: 3, Intermediate: 2, Beginner: 1 };

function fmtDate(value) {
  try {
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(value || "");
  }
}

function Block({ title, children }) {
  if (!children) return null;
  return (
    <section className="ex-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EmptyLine({ label, show }) {
  if (!show) return null;
  return <div className="ex-muted">{label}</div>;
}

// Always-light printable full-portfolio sheet. Mirrors the A4 print isolation
// of the Career Passport, but captures every authenticated section so the
// student gets one trustworthy PDF of their UPNEX record.
export default function PortfolioExport({ profile }) {
  const { t } = useTranslation();
  const p = profile || {};
  const user = p.user || {};
  const documents = Array.isArray(p.documents) ? p.documents.filter((doc) => doc.verified) : [];
  const projects = Array.isArray(p.projects) ? p.projects : [];
  const marks = Array.isArray(p.marks) ? p.marks : [];
  const experiences = Array.isArray(p.experiences) ? p.experiences : [];
  const learnings = Array.isArray(p.learnings) ? p.learnings : [];
  const achievements = Array.isArray(p.achievements) ? p.achievements : [];
  const skills = Array.isArray(user.skills) ? user.skills : [];
  const education = Array.isArray(user.education) ? user.education : [];
  const guidance = p.guidance || { paths: [] };
  const paths = Array.isArray(guidance.paths) ? guidance.paths : [];
  const topPath = paths[0] || null;
  const overview = p.analytics?.overview || null;
  const intelligence = Array.isArray(p.intelligence) ? p.intelligence : [];

  const evidenceBySkill = new Map(intelligence.map((skill) => [String(skill.name).toLowerCase(), skill.evidenceCount || 0]));

  const generated = fmtDate(new Date());
  const tagline = [user.headline, user.targetRole ? `Aiming for ${user.targetRole}` : ""].filter(Boolean).join(" · ");

  const statCells = [
    { label: t("export.readiness", "Readiness"), value: `${p.readiness || 0}%` },
    { label: t("export.completion", "Profile completion"), value: `${p.completion?.percent || 0}%` },
    { label: t("export.projects", "Projects"), value: String(projects.length) },
    { label: t("export.skills", "Skills"), value: String(skills.length || intelligence.length) },
    { label: t("export.verifiedCredentials", "Verified credentials"), value: String(documents.length) }
  ];

  const rangeOrder = [
    ["7", t("export.w7", "7 days")],
    ["30", t("export.w30", "30 days")],
    ["90", t("export.w90", "90 days")],
    ["all", t("export.wAll", "All time")]
  ];
  const overviewRows = [
    ["total", t("export.aTotal", "Total activity")],
    ["views", t("export.aViews", "Profile views")],
    ["projectClicks", t("export.aProjectClicks", "Project clicks")],
    ["credentialViews", t("export.aCredentialViews", "Credential checks")],
    ["shares", t("export.aShares", "Shares")],
    ["resumes", t("export.aResumes", "Resume opens")]
  ];
  const analyticsReady = overview && Number(overview.all?.total || 0) > 0;

  return (
    <div className="ex-screen">
      <div className="ex-toolbar">
        <Link to="/profile/portfolio" className="ex-back"><ArrowLeft size={16} /> {t("export.back", "Back to profile")}</Link>
        <button type="button" className="ex-print" onClick={() => window.print()}>
          <Printer size={15} /> {t("export.print", "Print / Save as PDF")} <Download size={14} />
        </button>
      </div>

      <article className="ex-sheet">
        <header className="ex-head">
          <div className="ex-brand">
            <Mark />
            <b>UPNEX</b>
          </div>
          <div className="ex-head-id">
            <span>{t("export.generated", "Generated")} {generated}</span>
            {user.username && <span>upnex.ai/{user.username}</span>}
          </div>
        </header>

        <div className="ex-masthead">
          <h1>{user.name || t("export.student", "Student")}</h1>
          {tagline && <p className="ex-tagline">{tagline}</p>}
          <div className="ex-meta">
            {user.location && <span>{user.location}</span>}
            {user.availability && <span>{user.availability}</span>}
            {user.careerGoal && <span>{user.careerGoal}</span>}
            {user.email && <span>{user.email}</span>}
          </div>
        </div>

        <div className="ex-stats">
          {statCells.map((cell) => (
            <div className="ex-stat" key={cell.label}>
              <strong>{cell.value}</strong>
              <span>{cell.label}</span>
            </div>
          ))}
        </div>

        <Block title={t("export.careerSignal", "CAREER SIGNAL")}>
          {topPath ? (
            <>
              <p className="ex-signal-line">
                <strong>{topPath.title}</strong> — {topPath.match}% {t("export.match", "match")}
              </p>
              <EmptyLine label={t("export.signalSub", "Strongest match based on academic marks and proof-of-work evidence.")} show />
            </>
          ) : (
            <p className="ex-muted">{t("export.noSignal", "Add marks and projects to unlock career guidance.")}</p>
          )}
        </Block>

        {analyticsReady && (
          <Block title={t("export.analytics", "PROFILE ACTIVITY")}>
            <table className="ex-table">
              <thead>
                <tr><th></th>{rangeOrder.map(([, label]) => <th key={label}>{label}</th>)}</tr>
              </thead>
              <tbody>
                {overviewRows.map(([key, label]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    {rangeOrder.map(([r]) => <td key={r}>{overview[r]?.[key] || 0}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </Block>
        )}

        <Block title={t("export.academics", "ACADEMICS")}>
          {marks.length ? (
            <>
              {guidance.average ? (
                <p className="ex-muted">{t("export.average", "Average")}: <strong>{guidance.average}%</strong></p>
              ) : null}
              <ul className="ex-list ex-marks">
                {marks.map((mark) => (
                  <li key={mark.id || `${mark.subject}-${mark.category}`}>
                    <span><strong>{mark.subject}</strong> · {mark.category}</span>
                    <b>{mark.score}/{mark.maxScore ?? 100}</b>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="ex-muted">{t("export.noMarks", "No academic marks recorded.")}</p>
          )}
        </Block>

        <Block title={t("export.skills", "SKILLS")}>
          {skills.length ? (
            <ul className="ex-list ex-skills">
              {skills.map((skill) => {
                const name = String(skill?.name || "").trim();
                if (!name) return null;
                const level = skill?.level && LEVEL_VALUE[skill.level] ? skill.level : null;
                const evidence = evidenceBySkill.get(name.toLowerCase()) || 0;
                return (
                  <li key={name}>
                    <span><strong>{name}</strong>{level ? ` · ${level}` : ""}</span>
                    {evidence > 0 && <em>{t("export.evidence", "{{count}} evidence", { count: evidence })}</em>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="ex-muted">{t("export.noSkills", "No skills added yet.")}</p>
          )}
        </Block>

        <Block title={t("export.education", "EDUCATION")}>
          {education.length ? (
            <ul className="ex-list ex-edu">
              {education.map((entry, index) => (
                <li key={`${entry.degree}-${index}`}>
                  <span><strong>{entry.degree}</strong>{entry.institution ? ` · ${entry.institution}` : ""}</span>
                  <em>{[entry.startYear, entry.endYear].filter(Boolean).join(" – ")}{entry.grade ? ` · ${entry.grade}` : ""}</em>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ex-muted">{t("export.noEducation", "No education added.")}</p>
          )}
        </Block>

        <Block title={t("export.projects", "PROJECTS")}>
          {projects.length ? (
            <ul className="ex-list ex-projects">
              {projects.map((project) => (
                <li key={project.id || project.title}>
                  <div>
                    <strong>{project.title}</strong>
                    {project.status ? <em className="ex-chip">{project.status}</em> : null}
                  </div>
                  {project.description && <p>{project.description}</p>}
                  {Array.isArray(project.skills) && project.skills.length > 0 && (
                    <div className="ex-chips">{project.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ex-muted">{t("export.noProjects", "No projects published.")}</p>
          )}
        </Block>

        <Block title={t("export.credentials", "VERIFIED CREDENTIALS")}>
          {documents.length ? (
            <table className="ex-table">
              <thead>
                <tr><th>{t("export.doc", "Document")}</th><th>{t("export.issuer", "Issuer")}</th><th>{t("export.date", "Date")}</th><th>{t("export.verifyId", "Verification ID")}</th></tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id || doc.verificationId}>
                    <td><strong>{doc.fileName}</strong> <em>{doc.documentType}</em></td>
                    <td>{doc.issuer || "—"}</td>
                    <td>{fmtDate(doc.createdAt)}</td>
                    <td><code>{doc.verificationId}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="ex-muted">{t("export.noCredentials", "No verified credentials yet.")}</p>
          )}
        </Block>

        <Block title={t("export.experience", "EXPERIENCE")}>
          {experiences.length ? (
            <ul className="ex-list ex-timeline">
              {experiences.map((entry) => (
                <li key={entry.id || `${entry.role}-${entry.company}`}>
                  <div>
                    <strong>{entry.role}</strong>{entry.company ? ` · ${entry.company}` : ""}
                    {entry.current ? <em className="ex-chip">{t("export.current", "current")}</em> : null}
                  </div>
                  <p className="ex-muted">{[entry.startDate, entry.endDate].filter(Boolean).join(" – ")}</p>
                  {entry.description && <p>{entry.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ex-muted">{t("export.noExperience", "No experience recorded.")}</p>
          )}
        </Block>

        <Block title={t("export.learnings", "LEARNING TRACK")}>
          {learnings.length ? (
            <ul className="ex-list">
              {learnings.map((entry) => (
                <li key={entry.id || entry.topic}>
                  <div>
                    <strong>{entry.topic}</strong>
                    {entry.category ? <em className="ex-chip">{entry.category}</em> : null}
                  </div>
                  {entry.progress ? <em className="ex-muted">{entry.progress}%</em> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ex-muted">{t("export.noLearnings", "No learning track recorded.")}</p>
          )}
        </Block>

        <Block title={t("export.achievements", "ACHIEVEMENTS")}>
          {achievements.length ? (
            <ul className="ex-list ex-timeline">
              {achievements.map((entry) => (
                <li key={entry.id || entry.title}>
                  <div>
                    <strong>{entry.title}</strong>
                    {entry.organization ? ` · ${entry.organization}` : ""}
                    {entry.verified ? <em className="ex-chip ex-chip-ok">{t("common.verified", "✓ Verified")}</em> : null}
                  </div>
                  <p className="ex-muted">{[entry.date, entry.category].filter(Boolean).join(" · ")}</p>
                  {entry.description && <p>{entry.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ex-muted">{t("export.noAchievements", "No achievements recorded.")}</p>
          )}
        </Block>

        <footer className="ex-foot">
          <span>{t("export.generatedBy", "Generated by UPNEX")} · {generated}</span>
          <span>upnex.ai/{user.username || "your-profile"}</span>
          <span>{t("export.privateByDefault", "Private by default — only content you publish is shared.")}</span>
        </footer>
      </article>
    </div>
  );
}