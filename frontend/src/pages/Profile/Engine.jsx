import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, AlertTriangle, Clock, Minus, Radar, ShieldAlert, Sparkles, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";
import api from "../../services/api";
import "./Engine.css";

const PERSONAS = {
  explorer: "Explorer",
  learner: "Learner",
  grinder: "Grinder",
  practitioner: "Practitioner",
  sniper: "Sniper"
};

const TIERS = {
  exploring: "Exploring",
  practising: "Practising",
  sharp: "Sharp",
  elite: "Elite"
};

const SPEEDS = {
  quick: "Quick",
  steady: "Steady",
  deliberate: "Deliberate"
};

const PRESSURES = {
  cool: "Cool under pressure",
  wavers: "Wavers under pressure",
  cracks: "Cracks under pressure"
};

function Persona({ insight }) {
  const { t } = useTranslation();
  const { overall } = insight;
  return (
    <section className="app-panel engine-persona">
      <span className="feature-eyebrow">{t("engine.personaEyebrow", "READING THE STUDENT")}</span>
      <div className="engine-persona-top">
        <strong>{PERSONAS[overall.persona] || overall.persona}</strong>
        <span className="engine-tier">{TIERS[overall.tier] || overall.tier}</span>
      </div>
      <div className="engine-persona-acc">
        <b>{overall.accuracy}%</b>
        <span>{t("engine.arenaAccuracy", "arena accuracy")}</span>
      </div>
      <div className="engine-persona-specs">
        <span><Zap size={13} /> {t("engine.gamesPlayed", "{{count}} games", { count: insight.totals.games })}</span>
        <span><Activity size={13} /> {t("engine.answersLocked", "{{count}} answers", { count: insight.totals.answered })}</span>
        <span><Sparkles size={13} /> {t("engine.correctLocked", "{{count}} correct", { count: insight.totals.correct })}</span>
      </div>
    </section>
  );
}

function Signature({ insight }) {
  const { t } = useTranslation();
  const { overall } = insight;
  const rows = [
    [Clock, t("engine.responseSpeed", "Response speed"), overall.speedLabel ? SPEEDS[overall.speedLabel] : "—"],
    [Activity, t("engine.consistency", "Consistency (spread)"), overall.consistency == null ? "—" : `±${overall.consistency} pp`],
    [ShieldAlert, t("engine.pressure", "Under the clock"), overall.pressureSignal ? PRESSURES[overall.pressureSignal] : "—"],
    [Minus, t("engine.medianSec", "Median time per correct"), overall.medianSecondsUse == null ? "—" : `${overall.medianSecondsUse}s`]
  ];
  return (
    <section className="app-panel engine-signature">
      <span className="feature-eyebrow">{t("engine.signatureEyebrow", "LEARNING SIGNATURE")}</span>
      <h3>{t("engine.signatureTitle", "How you actually perform")}</h3>
      <div className="engine-signature-rows">
        {rows.map(([Icon, label, value]) => (
          <div className="engine-sig-row" key={label}>
            <Icon size={14} />
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function Academics({ academics }) {
  const { t } = useTranslation();
  return (
    <section className="app-panel engine-signature">
      <span className="feature-eyebrow">{t("engine.academicsEyebrow", "ACADEMIC CROSS-SIGNAL")}</span>
      <h3>{t("engine.academicsTitle", "What the marksheet says")}</h3>
      <div className="engine-signature-rows">
        <div className="engine-sig-row"><Target size={14} /><span>{t("engine.trackedSubjects", "Tracked marks")}</span><b>{academics.tracked}</b></div>
        <div className="engine-sig-row"><Activity size={14} /><span>{t("engine.avgMark", "Average score")}</span><b>{academics.average == null ? "—" : `${academics.average}%`}</b></div>
        {academics.strongest && <div className="engine-sig-row"><TrendingUp size={14} /><span>{t("engine.strongest", "Strongest")}</span><b>{academics.strongest.subject} · {academics.strongest.pct}%</b></div>}
        {academics.weakest && <div className="engine-sig-row"><TrendingDown size={14} /><span>{t("engine.weakest", "Weakest")}</span><b>{academics.weakest.subject} · {academics.weakest.pct}%</b></div>}
      </div>
    </section>
  );
}

function KnowledgeMap({ map }) {
  const { t } = useTranslation();
  const TrendIcon = (trend) => (trend == null ? Minus : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus);
  const TrendClass = (trend) => (trend == null ? "flat" : trend > 0 ? "up" : trend < 0 ? "down" : "flat");
  return (
    <section className="app-panel engine-kmap">
      <div className="engine-panel-head">
        <div>
          <span className="feature-eyebrow">{t("engine.mapEyebrow", "KNOWLEDGE MAP")}</span>
          <h3>{t("engine.mapTitle", "Where your accuracy really sits")}</h3>
        </div>
      </div>
      {map.map((entry) => {
        const Trend = TrendIcon(entry.trend);
        return (
          <div className="engine-cat" key={entry.category}>
            <div className="engine-cat-name">
              <b>{entry.category}</b>
              <small>{t("engine.attemptsLine", "{{answered}} answered · {{skipped}} skipped", { answered: entry.answered, skipped: entry.skipped })}</small>
            </div>
            <div className="engine-cat-bar"><i><b style={{ width: `${entry.accuracy ?? 0}%` }} /></i><strong>{entry.accuracy == null ? "—" : `${entry.accuracy}%`}</strong><span className={`engine-trend ${TrendClass(entry.trend)}`} title={entry.trend == null ? t("engine.trendNeedsData", "needs more answers") : t("engine.trend", "accuracy change")}><Trend size={13} /></span></div>
          </div>
        );
      })}
    </section>
  );
}

function FocusPanel({ focus }) {
  const { t } = useTranslation();
  return (
    <aside className="app-panel engine-focus">
      <div className="engine-panel-head">
        <div>
          <span className="feature-eyebrow">{t("engine.focusEyebrow", "ENGINE'S PICK")}</span>
          <h3>{t("engine.focusTitle", "What to practise next")}</h3>
        </div>
        <Target size={18} />
      </div>
      <p className="engine-focus-body">{t("engine.focusSub", "Based on your weakest evidence, the engine wants you back in the arena on these.")}</p>
      {focus.length ? (
        focus.map((item) => (
          <div className="engine-focus-item" key={item.category}>
            <b>{item.category}</b>
            <span>{item.avoided ? t("engine.avoidsIt", "keeps dodging it") : item.accuracy == null ? "—" : t("engine.sitsAtPercent", "sits at {{accuracy}}%", { accuracy: item.accuracy })}</span>
          </div>
        ))
      ) : (
        <p className="empty-state">{t("engine.focusEmpty", "Not enough evidence yet — keep clashing.")}</p>
      )}
      <Link className="engine-cta" to="/clash"><Target size={14} /> {t("engine.focusCta", "Play a Clash on your weakest zone")}</Link>
    </aside>
  );
}

function CorrelatedPanel({ correlated }) {
  const { t } = useTranslation();
  return (
    <aside className="app-panel engine-correlated">
      <span className="feature-eyebrow">{t("engine.corrEyebrow", "HIDDEN LINKS")}</span>
      <h3>{t("engine.corrTitle", "Topics that fail together")}</h3>
      <p className="engine-focus-body">{t("engine.corrSub", "When you miss one of these, the engine expects the other to follow.")}</p>
      {correlated.length ? (
        correlated.map((pair) => (
          <div className="engine-corr-pair" key={`${pair.base}-${pair.partner}`}>
            <div><b>{pair.base}</b><AlertTriangle size={13} /><b>{pair.partner}</b></div>
            <span>{t("engine.liftTimes", "×{{lift}} more likely together", { lift: pair.lift })}</span>
          </div>
        ))
      ) : (
        <p className="empty-state">{t("engine.corrEmpty", "Play more Clashes to expose hidden links.")}</p>
      )}
    </aside>
  );
}

export default function Engine() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: result } = await api.get("/engine");
        if (alive) {
          setData(result.engine);
          setState(result.engine.hasData ? "ready" : "empty");
        }
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state === "loading") {
    return <div className="engine-loading"><Radar size={30} /><p>{t("engine.loading", "The engine is reading your evidence…")}</p></div>;
  }

  if (state === "empty") {
    return (
      <div className="engine-empty">
        <Radar size={42} />
        <h3>{t("engine.emptyTitle", "No evidence to read yet")}</h3>
        <p>{t("engine.emptySub", "Every answer you lock in a Clash — and every mark you track — feeds this engine. Play your first arena and it starts to understand you.")}</p>
        <Link to="/clash" className="engine-cta"><Zap size={14} /> {t("engine.emptyCta", "Enter the arena")}</Link>
      </div>
    );
  }

  if (state === "error") {
    return <div className="engine-empty"><AlertTriangle size={36} /><h3>{t("engine.errorTitle", "The engine hit a snag")}</h3><p>{t("engine.errorSub", "Refresh to try reading the evidence again.")}</p></div>;
  }

  return (
    <div className="engine-wrap">
      <div className="engine-overview">
        <Persona insight={data} />
        <Signature insight={data} />
        <Academics academics={data.academics} />
      </div>
      <div className="feature-grid feature-engine">
        <section className="feature-main-panel"><KnowledgeMap map={data.knowledgeMap} /></section>
        <div className="feature-side-panel engine-side-stack">
          <FocusPanel focus={data.focus} />
          <CorrelatedPanel correlated={data.correlated} />
        </div>
      </div>
    </div>
  );
}