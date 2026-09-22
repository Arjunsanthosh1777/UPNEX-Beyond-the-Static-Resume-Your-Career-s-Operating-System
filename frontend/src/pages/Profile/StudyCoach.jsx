import { useEffect, useState } from "react";
import { BookOpen, CalendarCheck, Lightbulb, Minus, NotebookPen, RotateCcw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import api from "../../services/api";
import { useTranslation } from "react-i18next";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function PanelHeading({ icon: Icon, eyebrow, title }) {
  return (
    <div className="panel-top profile-panel-heading"><div><span>{eyebrow}</span><h3>{title}</h3></div><Icon size={18} /></div>
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

export default function StudyCoach() {
  const { t } = useTranslation();
  const [coach, setCoach] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/profile/coach"), api.get("/profile/study-planner")])
      .then(([coachRes, planRes]) => {
        if (!active) return;
        setCoach(coachRes.data);
        setPlan(planRes.data);
      })
      .catch(() => { if (active) setError(t("studyCoach.loadFailed", "Couldn't load your study coach.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  if (loading) return <div className="screen-loader">{t("common.loading", "LOADING…")}</div>;

  const weaknesses = coach?.weaknesses || [];
  const strengths = coach?.strengths || [];
  const isEmpty = !coach || coach.empty;
  const doneCount = plan ? Object.values(plan.done).filter(Boolean).length : 0;
  const total = plan?.total || 0;

  const toggle = (key, done, isChecked) => {
    if (isChecked) return;
    const previous = plan;
    setPlan((current) => ({ ...current, done: { ...current.done, [key]: done } }));
    api.patch("/profile/study-planner", { key, done }).then((res) => setPlan((current) => ({ ...current, done: res.data.done }))).catch(() => setPlan(previous));
  };

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
          {isEmpty ? (
            <div className="empty-state"><NotebookPen size={17} />{coach?.message || t("studyCoach.emptyCoach", "Add your marks and UPNEX becomes your personal coach.")}</div>
          ) : weaknesses.length ? (
            weaknesses.map((weakness) => (
              <article className="study-coach-card" key={weakness.subject}>
                <div className="coach-subject-line">
                  <div><strong>{weakness.subject}</strong><small>{t("studyCoach.latestScore", "latest {{latest}}% · {{count}} entries", { latest: weakness.latest, count: weakness.count })}</small></div>
                  <div className="coach-score"><Trend trend={weakness.trend} /><b>{weakness.avg}%</b><small>avg</small></div>
                </div>
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
            <div className="empty-state"><Sparkles size={17} />{t("studyCoach.allHealthy", "No subjects need work right now. Keep every subject above 60%.")}</div>
          )}
        </section>

        <section className="app-panel feature-side-panel">
          <PanelHeading icon={CalendarCheck} eyebrow={t("studyCoach.planEyebrow", "THIS WEEK · AUTO-GENERATED")} title={t("studyCoach.planTitle", "Weekly study planner")} />
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
    </>
  );
}