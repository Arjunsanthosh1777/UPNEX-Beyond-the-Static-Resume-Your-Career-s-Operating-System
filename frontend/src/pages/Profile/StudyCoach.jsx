import { useEffect, useState } from "react";
import { BookOpen, CalendarCheck, CalendarDays, ChartColumn, Download, Flame, GraduationCap, Lightbulb, Minus, NotebookPen, Printer, RotateCcw, Sparkles, Target, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import api from "../../services/api";
import { useTranslation } from "react-i18next";
import { Mark } from "../../components/Logo";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtDate(value) {
  try { return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return String(value || ""); }
}

function PanelHeading({ icon: Icon, eyebrow, title, action }) {
  return (
    <div className="panel-top profile-panel-heading">
      <div><span>{eyebrow}</span><h3>{title}</h3></div>
      <div className="panel-heading-side">{action}{<Icon size={18} />}</div>
    </div>
  );
}

function Trend({ trend }) {
  if (trend === "up") return <TrendingUp size={14} className="trend-up" aria-label="improving" />;
  if (trend === "down") return <TrendingDown size={14} className="trend-down" aria-label="slipping" />;
  return <Minus size={14} className="trend-flat" aria-label="steady" />;
}

function KindBadge({ kind }) {
  const label = kind === "course" ? "Course" : kind === "practice" ? "Practice" : "Revision";
  return <span className={`kind-badge k-${kind}`}>{label}</span>;
}

function GoalBox({ weakness, editing, setEditing, saving, onSave, onRemove }) {
  const { t } = useTranslation();
  const goal = weakness.goal;
  if (goal != null) {
    const barWidth = goal.target > 0 ? Math.min(100, Math.round((weakness.avg / goal.target) * 100)) : 0;
    return (
      <div className="goal-box">
        <div className="goal-line">
          <span className="goal-pill"><Target size={13} /> {t("studyCoach.goalLabel", "TARGET")} {goal.target}%</span>
          {goal.targetMet ? (
            <em className="goal-met">{t("studyCoach.goalMet", "✓ Target met")}</em>
          ) : (
            <em className="goal-gap">{t("studyCoach.goalGap", "+{{gap}} gap", { gap: weakness.gap })}</em>
          )}
          <button type="button" className="goal-clear" onClick={onRemove} aria-label={t("studyCoach.removeGoal", "Remove target")}><X size={12} /></button>
        </div>
        <div className="goal-bar"><i><b style={{ width: `${barWidth}%` }} /></i></div>
        <button type="button" className="goal-change" onClick={() => setEditing(true)}>{t("studyCoach.changeGoal", "Change target")}</button>
      </div>
    );
  }
  if (editing) {
    return (
      <div className="goal-box">
        <div className="goal-input-row">
          <input type="number" min="1" max="100" defaultValue={weakness.goal?.target ?? 60} data-subject={weakness.subject} aria-label={t("studyCoach.targetInput", "Target score")} />
          <button type="button" className="goal-save" disabled={saving} onClick={onSave}>{saving ? "…" : t("studyCoach.saveGoal", "Set target")}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="goal-box goal-cta">
      <button type="button" className="goal-add" onClick={() => setEditing(true)}><Target size={13} /> {t("studyCoach.setGoal", "Set a target for this subject")}</button>
    </div>
  );
}

export default function StudyCoach({ profile }) {
  const { t } = useTranslation();
  const [coach, setCoach] = useState(null);
  const [plan, setPlan] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingGoal, setEditingGoal] = useState("");
  const [savingGoal, setSavingGoal] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/profile/coach"), api.get("/profile/study-planner"), api.get("/profile/study-progress")])
      .then(([coachRes, planRes, progressRes]) => {
        if (!active) return;
        setCoach(coachRes.data);
        setPlan(planRes.data);
        setProgress(progressRes.data);
      })
      .catch(() => { if (active) setError(t("studyCoach.loadFailed", "Couldn't load your study coach.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  if (loading) return <div className="screen-loader">{t("common.loading", "LOADING…")}</div>;

  const weaknesses = coach?.weaknesses || [];
  const strengths = coach?.strengths || [];
  const isEmpty = !coach || coach.empty;
  const currentSemester = coach?.currentSemester || null;
  const doneCount = plan ? Object.values(plan.done).filter(Boolean).length : 0;
  const total = plan?.total || 0;

  const toggle = (key, done, isChecked) => {
    if (isChecked) return;
    const previous = plan;
    setPlan((current) => ({ ...current, done: { ...current.done, [key]: done } }));
    api.patch("/profile/study-planner", { key, done }).then((res) => setPlan((current) => ({ ...current, done: res.data.done }))).catch(() => setPlan(previous));
  };

  const refreshCoach = () => api.get("/profile/coach").then((res) => setCoach(res.data)).catch(() => {});
  const refreshProgress = () => api.get("/profile/study-progress").then((res) => setProgress(res.data)).catch(() => {});

  const saveGoal = (subject) => {
    const input = document.querySelector(`input[data-subject="${CSS.escape(subject)}"]`);
    const target = Number(input?.value);
    if (!Number.isInteger(target) || target < 1 || target > 100) return;
    setSavingGoal(subject);
    api.put("/profile/study-goals", { subject, target })
      .then(() => { setEditingGoal(""); refreshCoach(); refreshProgress(); })
      .catch(() => {})
      .finally(() => setSavingGoal(""));
  };

  const removeGoal = (subject) => {
    api.delete(`/profile/study-goals/${encodeURIComponent(subject)}`)
      .then(() => refreshCoach())
      .catch(() => {});
  };

  const weekLabel = plan?.weekStart ? fmtDate(plan.weekStart) : "";

  const exportStats = [
    { label: t("export.readiness", "Week completion"), value: total ? `${Math.round((doneCount / total) * 100)}%` : "—" },
    { label: t("studyCoach.weekOf", "Week of"), value: weekLabel },
    { label: t("studyCoach.streakLabel", "Streak"), value: progress?.streak ? `${progress.streak} wk` : "—" },
    { label: t("studyCoach.goalsSetLabel", "Goals set"), value: `${progress?.goals?.set ?? 0} (${progress?.goals?.met ?? 0} met)` }
  ];

  return (
    <>
      {error && <div className="profile-message">{error}</div>}
      <div className="analysis-overview">
        <div className="app-panel"><span className="feature-eyebrow">{t("studyCoach.coachKpi", "SUBJECTS TO FIX")}</span><strong className="big-number">{weaknesses.length}</strong><p>{t("studyCoach.needsWork", "weakest subjects getting coaching")}</p></div>
        <div className="app-panel"><span className="feature-eyebrow">{t("studyCoach.planKpi", "WEEKLY PLAN")}</span><strong className="big-number">{total ? Math.round((doneCount / total) * 100) : 0}%</strong><p>{total ? t("studyCoach.sessionsDone", "{{done}} of {{total}} study sessions done", { done: doneCount, total }) : t("studyCoach.noSessions", "no sessions scheduled yet")}</p></div>
        <div className="app-panel"><span className="feature-eyebrow">{t("studyCoach.strongKpi", "STRONGEST SUBJECT")}</span><strong className="big-label">{strengths[0]?.subject || "—"}</strong><p>{strengths.map((entry) => `${entry.subject} ${entry.avg}%`).join(" · ") || t("studyCoach.noStrengths", "add marks to reveal them")}</p></div>
      </div>

      <div className="feature-grid feature-study">
        <section className="app-panel feature-main-panel">
          <PanelHeading icon={Lightbulb} eyebrow={t("studyCoach.coachEyebrow", "DERIVED FROM YOUR MARKS")} title={t("studyCoach.coachTitle", "Smart subject coach")} />
          {currentSemester && (
            <p className="semester-note"><GraduationCap size={14} /> {t("studyCoach.currentSemester", "Prioritising your current semester — SEM {{semester}} {{year}}", { semester: currentSemester.semester, year: currentSemester.year || "" })}</p>
          )}
          {isEmpty ? (
            <div className="empty-state"><NotebookPen size={17} />{coach?.message || t("studyCoach.emptyCoach", "Add your marks and UPNEX becomes your personal coach.")}</div>
          ) : weaknesses.length ? (
            weaknesses.map((weakness) => (
              <article className="study-coach-card" key={weakness.subject}>
                <div className="coach-subject-line">
                  <div><strong>{weakness.subject}</strong><small>{t("studyCoach.latestScore", "latest {{latest}}% · {{count}} entries", { latest: weakness.latest, count: weakness.count })}</small></div>
                  <div className="coach-score"><Trend trend={weakness.trend} /><b>{weakness.avg}%</b><small>avg</small>{weakness.current && <em className="semester-chip">{t("studyCoach.currentSem", "THIS SEM")}</em>}</div>
                </div>
                <GoalBox
                  weakness={weakness}
                  editing={editingGoal === weakness.subject}
                  setEditing={(open) => setEditingGoal(open ? weakness.subject : "")}
                  saving={savingGoal === weakness.subject}
                  onSave={() => saveGoal(weakness.subject)}
                  onRemove={() => removeGoal(weakness.subject)}
                />
                <ul className="coach-tips">{weakness.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                {weakness.courses.length ? (
                  <div className="coach-courses">
                    <span>{t("studyCoach.fixWith", "Fix it with a course")}</span>
                    {weakness.courses.map((course) => (
                      <div className="course-chip" key={course.id}>
                        <BookOpen size={13} />
                        <div><b>{course.title}</b><small>{course.category} · {course.level}{course.lessons?.length ? ` · ${course.lessons.length} lessons` : ""}</small></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="coach-no-course">{t("studyCoach.noCourse", "No catalogue course matches this subject yet — keep practising.")}</p>
                )}
              </article>
            ))
          ) : (
            <div className="empty-state"><Sparkles size={17} />{t("studyCoach.allHealthy", "No subjects need work right now. You can still set a goal on any weak-ish subject.")}</div>
          )}
        </section>

        <section className="app-panel feature-side-panel">
          <PanelHeading
            icon={CalendarCheck}
            eyebrow={t("studyCoach.planEyebrow", "THIS WEEK · AUTO-GENERATED")}
            title={t("studyCoach.planTitle", "Weekly study planner")}
            action={<button type="button" className="export-btn" onClick={() => setExporting(true)} disabled={!plan}><Download size={14} /> {t("studyCoach.exportWeek", "Export")}</button>}
          />
          {total ? (
            <>
              <div className="plan-progress">
                <i><b style={{ width: `${Math.round((doneCount / total) * 100)}%` }} /></i>
                <span>{doneCount}/{total}</span>
              </div>
              <div className="plan-days">
                {plan.plan.map((day) => (
                  <details className="plan-day" key={day.day} open={day.day < 2}>
                    <summary>{WEEKDAYS[day.day]}</summary>
                    <div className="plan-slots">
                      {day.slots.map((slot) => {
                        const done = Boolean(plan.done[slot.key]);
                        return (
                          <div className={`plan-slot ${done ? "done" : ""}`} key={slot.key}>
                            <button
                              type="button"
                              className="slot-check"
                              aria-pressed={done}
                              aria-label={done ? t("studyCoach.markUndone", "Mark as not done") : t("studyCoach.markDone", "Mark as done")}
                              onClick={() => toggle(slot.key, !done, done)}
                            >
                              {done ? "✓" : ""}
                            </button>
                            <div className="slot-body">
                              <div className="slot-title"><b>{slot.subject}</b><KindBadge kind={slot.kind} /></div>
                              <small>{slot.focus}</small>
                              <span className="slot-time">{slot.time}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <RotateCcw size={17} />
              {t("studyCoach.planEmpty", "The plan builds from your weak subjects and incomplete Skill Bridge courses. Add marks or enroll in a course, then come back.")}
            </div>
          )}
        </section>
      </div>

      <section className="app-panel consistency-panel">
        <PanelHeading icon={ChartColumn} eyebrow={t("studyCoach.consistencyEyebrow", "YOUR TRACK RECORD")} title={t("studyCoach.consistencyTitle", "Study consistency")} />
        <div className="consistency-body">
          <div className="consistency-viz">
            {progress && progress.weeks.length ? (
              <div className="wk-bars">
                {progress.weeks.map((week, index) => (
                  <div className="wk-bar-col" key={week.start}>
                    <i className="wk-bar-track"><b style={{ height: `${Math.max(week.pct, 6)}%` }} /></i>
                    <span>{DAY_ABBR[index % 7]}</span>
                    <small>{week.pct}%</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">{t("studyCoach.noConsistency", "No weeks tracked yet — tick off some sessions to start your record.")}</div>
            )}
          </div>
          <div className="consistency-stats">
            <div className="consistency-stat"><Flame size={16} className="stat-icon" /><strong>{progress?.streak ?? 0}</strong><span>{t("studyCoach.streakLabel", "week streak")}</span></div>
            <div className="consistency-stat"><CalendarDays size={16} className="stat-icon" /><strong>{progress?.totals?.sessionsDone ?? 0}</strong><span>{t("studyCoach.sessionsDoneTotal", "sessions completed")}</span></div>
            <div className="consistency-stat"><Target size={16} className="stat-icon" /><strong>{progress?.goals?.set ?? 0}</strong><span>{t("studyCoach.goalsSetLabel", "goals set ({{met}} met)", { met: progress?.goals?.met ?? 0 })}</span></div>
            <div className="consistency-stat"><CalendarCheck size={16} className="stat-icon" /><strong>{progress?.totals?.weeksActive ?? 0}</strong><span>{t("studyCoach.weeksActive", "active weeks")}</span></div>
          </div>
        </div>
      </section>

      {exporting && plan && (
        <div className="ex-overlay">
          <div className="ex-toolbar">
            <button type="button" className="ex-back" onClick={() => setExporting(false)}><X size={16} /> {t("export.back", "Back to Smart Study")}</button>
            <button type="button" className="ex-print" onClick={() => window.print()}>
              <Printer size={15} /> {t("export.print", "Print / Save as PDF")} <Download size={14} />
            </button>
          </div>
          <article className="ex-sheet">
            <header className="ex-head">
              <div className="ex-brand"><Mark /><b>UPNEX</b></div>
              <div className="ex-head-id"><span>{t("export.generated", "Generated")} {fmtDate(new Date())}</span><span>upnex.ai/{profile?.user?.username || "your-profile"}</span></div>
            </header>
            <div className="ex-masthead">
              <h1>{t("studyCoach.exportTitle", "Smart Study Plan")}</h1>
              <p className="ex-tagline">{profile?.user?.name ? `${profile.user.name} · ` : ""}{t("studyCoach.explorerSub", "week of")} {weekLabel}</p>
              <div className="ex-meta">{exportStats.map((cell) => <span key={cell.label}><strong>{cell.value}</strong> {cell.label}</span>)}</div>
            </div>

            <section className="ex-block">
              <h2>{t("studyCoach.focusTitle", "THIS WEEK'S FOCUS")}</h2>
              {weaknesses.length ? (
                <ul className="ex-list">
                  {weaknesses.map((weakness) => (
                    <li key={weakness.subject}>
                      <div><strong>{weakness.subject}</strong> — {weakness.avg}% avg{weakness.goal ? ` (target ${weakness.goal.target}%${weakness.targetMet ? " ✓ met" : `, ${weakness.gap} gap`})` : ""}{weakness.current ? " · current semester" : ""}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ex-muted">{t("studyCoach.allHealthy", "No subjects need work right now.")}</p>
              )}
            </section>

            <section className="ex-block">
              <h2>{t("studyCoach.planTitle", "Weekly study planner")}</h2>
              {plan.plan.map((day) => (
                <div key={day.day} className="ex-day">
                  <h3>{WEEKDAYS[day.day]}</h3>
                  {day.slots.map((slot) => {
                    const done = Boolean(plan.done[slot.key]);
                    return (
                      <div className="ex-slot" key={slot.key}>
                        <span className="ex-slot-mark">{done ? "✓" : "○"}</span>
                        <span className="ex-slot-body"><strong>{slot.subject}</strong> <em>{slot.kind}</em> · {slot.focus}</span>
                        <b>{slot.time}</b>
                      </div>
                    );
                  })}
                </div>
              ))}
            </section>

            <footer className="ex-foot">
              <span>{t("studyCoach.explorerGen", "Generated by UPNEX Smart Study")} · {fmtDate(new Date())}</span>
              <span>upnex.ai/{profile?.user?.username || "your-profile"}</span>
              <span>{t("export.privateByDefault", "Private by default — only content you publish is shared.")}</span>
            </footer>
          </article>
        </div>
      )}
    </>
  );
}