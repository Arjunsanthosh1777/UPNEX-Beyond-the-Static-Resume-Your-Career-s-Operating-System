import { useMemo, useState } from "react";
import { BookOpenCheck, FolderKanban, Github } from "lucide-react";

const COLOR = {
  skill: "#7c4dff",
  project: "#a98bff",
  github: "#59a7ff",
  credential: "#53d58b"
};

const KIND_META = {
  project: { label: "Project", Icon: FolderKanban, color: COLOR.project },
  github: { label: "GitHub", Icon: Github, color: COLOR.github },
  credential: { label: "Verified credential", Icon: BookOpenCheck, color: COLOR.credential }
};

function dedupeLinks(links) {
  const seen = new Set();
  const out = [];
  for (const link of links) {
    const key = `${link.kind}:${link.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(link);
  }
  return out;
}

// Normalizes the two API shapes into one graph model.
// Owned:  { name, level, projects[], github[], credentials[], evidenceCount }
// Public: { name, level, evidence: [{type, title}], evidenceCount }
// Credential names are matched against skill names (same rule as the backend).
function buildModel(skills, credentials) {
  return (Array.isArray(skills) ? skills : [])
    .map((entry) => {
      const name = String(entry?.name || entry?.label || "").trim();
      if (!name) return null;
      let links = [];
      for (const title of entry?.projects || []) links.push({ kind: "project", title });
      for (const title of entry?.github || []) links.push({ kind: "github", title });
      for (const title of entry?.credentials || []) links.push({ kind: "credential", title });
      for (const item of entry?.evidence || []) {
        const kind = item?.type === "github" ? "github" : "project";
        if (item?.title) links.push({ kind, title: item.title });
      }
      for (const cred of Array.isArray(credentials) ? credentials : []) {
        const title = String(cred?.title || "").trim();
        if (title && title.toLowerCase().includes(name.toLowerCase())) {
          links.push({ kind: "credential", title });
        }
      }
      links = dedupeLinks(links);
      return { name, level: entry?.level || null, links, evidenceCount: links.length };
    })
    .filter(Boolean);
}

const MAX_SKILLS = 10;
const MAX_EVIDENCE = 6;

function Pt(x, y) {
  return { x, y };
}

export default function SkillGraph({ skills, credentials = [], title, subtitle }) {
  const model = useMemo(() => buildModel(skills, credentials), [skills, credentials]);
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(null);

  const activeIndex = hovered ?? selected;
  const visible = model.slice(0, MAX_SKILLS);
  const hiddenCount = model.length - visible.length;
  const active = visible[activeIndex];
  const activeEvidence = active ? active.links.slice(0, MAX_EVIDENCE) : [];

  const W = 680;
  const H = 470;
  const cx = W / 2;
  const cy = H / 2 - 6;
  const hubR = 46;
  const skillR = 124;
  const evR = 196;
  const n = Math.max(visible.length, 1);
  const startAngle = -Math.PI / 2;

  const skillsRing = visible.map((_, index) => {
    const angle = startAngle + (index / n) * Math.PI * 2;
    return Pt(cx + Math.cos(angle) * skillR, cy + Math.sin(angle) * skillR);
  });

  const evidenceNodes = [];
  if (active && activeEvidence.length) {
    const center = skillsRing[activeIndex];
    const base = Math.atan2(center.y - cy, center.x - cx);
    const arc = 0.62 * Math.PI;
    activeEvidence.forEach((link, index) => {
      const t = activeEvidence.length === 1 ? 0 : index / (activeEvidence.length - 1) - 0.5;
      const angle = base + t * arc;
      const ripple = index % 2 === 1 ? 1 : 0;
      evidenceNodes.push({
        link,
        at: Pt(cx + Math.cos(angle) * evR, cy + Math.sin(angle) * evR + ripple * 18)
      });
    });
  }

  const legend = [
    { kind: "skill", label: "Skills" },
    { kind: "project", label: "Projects" },
    { kind: "github", label: "GitHub" },
    { kind: "credential", label: "Credentials" }
  ];

  if (model.length === 0) {
    return (
      <div className="sg-wrap">
        <div className="sg-head"><div><span className="feature-eyebrow">{title || "SKILL EVIDENCE GRAPH"}</span>{subtitle && <p className="sg-subtitle">{subtitle}</p>}</div></div>
        <div className="sg-empty">{subtitle ? subtitle : "Skills appear here once you declare them and link projects or credentials."}</div>
      </div>
    );
  }

  return (
    <div className="sg-wrap">
      <div className="sg-head">
        <div>
          <span className="feature-eyebrow">{title || "SKILL EVIDENCE GRAPH"}</span>
          {subtitle && <p className="sg-subtitle">{subtitle}</p>}
        </div>
        <div className="sg-legend" aria-hidden="true">
          {legend.map((item) => (
            <span key={item.kind}><i style={{ background: COLOR[item.kind] }} />{item.label}</span>
          ))}
        </div>
      </div>

      <div className="sg-canvas">
        <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Skill evidence graph with ${model.length} skills.`} className="sg-svg">
          <g className="sg-fog" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => {
              const angle = (index / 7) * Math.PI * 2;
              return <line key={index} x1={cx} y1={cy} x2={cx + Math.cos(angle) * 235} y2={cy + Math.sin(angle) * 235} />;
            })}
            <circle cx={cx} cy={cy} r={skillR} />
            <circle cx={cx} cy={cy} r={evR} />
          </g>

          {skillsRing.map((point, index) => {
            const isActive = index === activeIndex;
            return (
              <line
                key={`edge-${index}`}
                className={`sg-edge ${isActive ? "active" : ""}`}
                x1={cx}
                y1={cy}
                x2={point.x}
                y2={point.y}
              />
            );
          })}

          {evidenceNodes.map((node, index) => {
            const skillPoint = skillsRing[activeIndex];
            return (
              <line
                key={`ev-edge-${index}`}
                className={`sg-edge sg-edge-evidence ${COLOR[node.link.kind] ? `sg-edge-${node.link.kind}` : ""}`}
                x1={skillPoint.x}
                y1={skillPoint.y}
                x2={node.at.x}
                y2={node.at.y}
              />
            );
          })}

          <g role="button" tabIndex={0} aria-pressed={activeIndex === -1}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(activeIndex); } }}>
            <circle className="sg-hub" cx={cx} cy={cy} r={hubR} />
            <text className="sg-hub-count" x={cx} y={cy - 1}>{model.length}</text>
            <text className="sg-hub-label" x={cx} y={cy + 16}>SKILLS</text>
          </g>

          {visible.map((skill, index) => {
            const point = skillsRing[index];
            const isActive = index === activeIndex;
            return (
              <g
                key={skill.name}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-label={`${skill.name}, ${skill.evidenceCount} evidence item${skill.evidenceCount === 1 ? "" : "s"}`}
                className={`sg-skill-node ${isActive ? "active" : ""}`}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(index);
                  }
                }}
              >
                <circle r="20" cx={point.x} cy={point.y} />
                <text className="sg-skill-count" x={point.x} y={point.y + 4}>{skill.evidenceCount}</text>
                <text className="sg-skill-name" x={point.x} y={point.y + 40}>{skill.name.length > 14 ? `${skill.name.slice(0, 13)}…` : skill.name}</text>
              </g>
            );
          })}

          {evidenceNodes.map((node, index) => (
            <g key={`node-${index}`} className="sg-ev-node">
              <circle r="19" cx={node.at.x} cy={node.at.y} className={`sg-ev-circle sg-ev-${node.link.kind}`} />
              <text className="sg-ev-initial" x={node.at.x} y={node.at.y + 4}>{node.link.title.charAt(0).toUpperCase()}</text>
              <text className="sg-ev-name" x={node.at.x} y={node.at.y + 40}>{node.link.title.length > 15 ? `${node.link.title.slice(0, 14)}…` : node.link.title}</text>
            </g>
          ))}
        </svg>

        {hiddenCount > 0 && (
          <div className="sg-more">+{hiddenCount} more skills not shown</div>
        )}

        <div className="sg-panel">
          {active && (
            <>
              <div className="sg-panel-head">
                <span className="sg-dot" style={{ background: COLOR.skill }} />
                <strong>{active.name}</strong>
                {active.level && <small className="sg-level">{active.level}</small>}
                <em>{active.evidenceCount} evidence item{active.evidenceCount === 1 ? "" : "s"}</em>
              </div>
              {activeEvidence.length ? (
                <ul className="sg-evidence-list">
                  {active.evidence.map((link, index) => {
                    const meta = KIND_META[link.kind] || KIND_META.project;
                    const Icon = meta.Icon;
                    return (
                      <li key={`${link.kind}-${link.title}`}>
                        <Icon size={15} color={meta.color} />
                        <span>{link.title}</span>
                        <small>{meta.label}</small>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="sg-no-evidence">No linked evidence yet — add a project or credential that mentions this skill.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}