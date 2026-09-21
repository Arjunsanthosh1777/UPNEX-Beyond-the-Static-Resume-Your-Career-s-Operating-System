import { GraduationCap, Printer, ShieldCheck, Sparkles } from "lucide-react";
import { Mark } from "../Logo";

function Capsule({ children }) {
  return <span className="pa-capsule">{children}</span>;
}

function fmtDate(dateString) {
  if (!dateString) return null;
  return String(dateString);
}

// Printable one-page "Career Passport": a condensed, verified snapshot of the
// student's public record. Always rendered on white for clean printing in both
// themes. Placeholder-ish empty states are never printed.
export default function CareerPassport({ profile }) {
  const user = profile?.user || {};
  const intelligence = profile?.intelligence || [];
  const documents = (profile?.documents || []).filter((document) => document.verified);
  const projects = (profile?.projects || []).slice(0, 6);
  const experiences = profile?.experiences || [];
  const learnings = (profile?.learnings || []).slice(0, 4);
  const achievements = profile?.achievements || [];
  const education = Array.isArray(user.education) ? user.education : [];
  const skills = Array.isArray(user.skills) ? user.skills : [];
  const marks = profile?.marks || [];
  const guidance = profile?.guidance || {};
  const completion = profile?.completion?.percent ?? 0;

  const evidenceBySkill = new Map(intelligence.map((entry) => [String(entry.name).toLowerCase(), entry.evidenceCount]));
  const cgpa = marks.length ? Math.round((guidance.average / 10) * 10) / 10 : null;

  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="passport-scope">
      <div className="pa-toolbar">
        <button type="button" className="app-primary" onClick={() => window.print()}>
          <Printer size={15} /> Print / Save as PDF
        </button>
        <span className="pa-toolbar-hint">Use the print dialog to save this as a PDF. One page, A4.</span>
      </div>

      <article className="pa-sheet">
        <header className="pa-masthead">
          <div className="pa-brand"><Mark /><b>UPNEX</b></div>
          <div className="pa-serial">
            <small>Career Passport</small>
            <strong>{user.username ? `@${user.username}` : "Career Passport"}</strong>
          </div>
          <div className="pa-verified"><ShieldCheck size={14} /> VERIFIED RECORD</div>
        </header>

        <section className="pa-identity">
          <h1>{user.name || "Student"}</h1>
          {user.headline && <p className="pa-headline">{user.headline}</p>}
          <p className="pa-meta">
            {[user.location, user.targetRole, user.careerGoal].filter(Boolean).join(" · ") || "UPNEX student"}
          </p>
        </section>

        <section className="pa-stats">
          {guidance.average ? <div><strong>{guidance.average}%</strong><span>Academic average</span></div> : null}
          {cgpa ? <div><strong>{cgpa}</strong><span>CGPA (avg)</span></div> : null}
          <div><strong>{skills.length}</strong><span>Skills</span></div>
          <div><strong>{projects.length || 0}</strong><span>Projects</span></div>
          <div><strong>{documents.length}</strong><span>Verified credentials</span></div>
          <div><strong>{experiences.length}</strong><span>Experience</span></div>
          <div><strong>{completion}%</strong><span>Profile completeness</span></div>
        </section>

        {user.bio ? (
          <section className="pa-sec">
            <h2>Professional summary</h2>
            <p>{user.bio}</p>
          </section>
        ) : null}

        {(user.targetRole || user.careerGoal || (user.interests || []).length) ? (
          <section className="pa-sec">
            <h2>Career direction</h2>
            <div className="pa-capsules">
              {user.targetRole && <Capsule>Target: {user.targetRole}</Capsule>}
              {user.careerGoal && <Capsule>{user.careerGoal}</Capsule>}
              {(user.interests || []).slice(0, 6).map((interest) => <Capsule key={interest}>{interest}</Capsule>)}
              {(user.openTo || []).slice(0, 4).map((item) => <Capsule key={item}>Open to {item}</Capsule>)}
            </div>
          </section>
        ) : null}

        <section className="pa-sec pa-grid-two">
          <div>
            <h2>Skills &amp; evidence</h2>
            {skills.length ? (
              <ul className="pa-list">
                {skills.slice(0, 12).map((skill) => {
                  const count = evidenceBySkill.get(String(skill.name).toLowerCase()) ?? 0;
                  return (
                    <li key={skill.name}>
                      <span className="pa-dot" />
                      {skill.name}
                      {skill.level && <small>{skill.level}</small>}
                      <em>{count ? `${count} evidence` : "no evidence linked"}</em>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="pa-muted">No skills declared yet.</p>}
          </div>

          {guidance && (guidance.average || guidance.strongest) ? (
            <div>
              <h2>Academic snapshot</h2>
              {guidance.strongest && (
                <p className="pa-strongest"><Sparkles size={13} /> Strongest signal: {guidance.strongest}</p>
              )}
              <ul className="pa-list">
                <li><span className="pa-dot" />Academic average across {marks.length} subject{marks.length === 1 ? "" : "s"}</li>
                <li><span className="pa-dot" />CGPA equivalent: {cgpa ?? "—"}</li>
              </ul>
            </div>
          ) : null}
        </section>

        <section className="pa-sec pa-grid-two">
          {education.length ? (
            <div>
              <h2>Education</h2>
              <ul className="pa-list">
                {education.map((entry, index) => (
                  <li key={`${entry.degree}-${index}`}>
                    <span className="pa-dot" />
                    {[entry.degree, entry.institution].filter(Boolean).join(" — ")}
                    {(entry.year || entry.endDate) && <small>{entry.year || entry.endDate}</small>}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {experiences.length ? (
            <div>
              <h2>Experience</h2>
              <ul className="pa-list">
                {experiences.map((entry, index) => (
                  <li key={`${entry.role}-${index}`}>
                    <span className="pa-dot" />
                    {entry.role}{entry.company ? ` at ${entry.company}` : ""}
                    <small>
                      {[fmtDate(entry.startDate), entry.current ? "Present" : fmtDate(entry.endDate)].filter(Boolean).join(" → ") || entry.type}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {projects.length ? (
          <section className="pa-sec">
            <h2>Featured work</h2>
            <div className="pa-projects">
              {projects.map((project) => (
                <div className="pa-project" key={project.id}>
                  <strong>{project.featured ? "★ " : ""}{project.title}</strong>
                  {project.description && <p>{project.description}</p>}
                  {(project.skills && project.skills.length) ? (
                    <small>{Array.isArray(project.skills) ? project.skills.join(", ") : project.skills}</small>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {learnings.length ? (
          <section className="pa-sec">
            <h2><GraduationCap size={14} /> Currently learning</h2>
            <ul className="pa-list pa-inline">
              {learnings.map((entry) => (
                <li key={`${entry.topic}-${entry.category}`}>
                  <span className="pa-dot" />{entry.topic}
                  {typeof entry.progress === "number" && <em>{entry.progress}%</em>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {achievements.length ? (
          <section className="pa-sec">
            <h2>Achievements</h2>
            <ul className="pa-list">
              {achievements.map((entry, index) => (
                <li key={`${entry.title}-${index}`}>
                  <span className="pa-dot" />
                  {entry.title}{entry.organization ? ` — ${entry.organization}` : ""}
                  {entry.verified && <em className="pa-verified-tag">verified</em>}
                  {fmtDate(entry.date) && <em>{fmtDate(entry.date)}</em>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {documents.length ? (
          <section className="pa-sec">
            <h2>Verified credentials</h2>
            <ul className="pa-list">
              {documents.map((document) => (
                <li key={document.id}>
                  <span className="pa-dot" />
                  {document.fileName}
                  <small>{document.documentType}{document.issuer ? ` · ${document.issuer}` : ""}</small>
                  {document.verificationId && <em>ID {document.verificationId}</em>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="pa-footer">
          Generated by UPNEX on {today} · upnex.ai/{user.username || "your-profile"}
        </footer>
      </article>
    </div>
  );
}