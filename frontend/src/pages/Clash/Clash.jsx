import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Copy, Crown, FileUp, LogOut, Play, RotateCcw, Swords, Timer, Trash2, Trophy, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Mark } from "../../components/Logo";
import "./Clash.css";

const POLL_MS = 1200;

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback;
}

function Initials({ name = "?", side = "" }) {
  const text = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  return <span className={`clash-avatar ${side}`}>{text}</span>;
}

export default function Clash() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [game, setGame] = useState(null);
  const [flash, setFlash] = useState("");
  const [pendingJoin, setPendingJoin] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [picked, setPicked] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [quizNotes, setQuizNotes] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState(null);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizPanel, setQuizPanel] = useState(false);
  const pollRef = useRef(null);
  const fileRef = useRef(null);

  const stateCode = params.get("code") ? String(params.get("code")).slice(0, 8).toUpperCase() : "";

  // -------- arena + leaderboard data --------
  const refreshGame = useCallback(async (id, { quiet = false } = {}) => {
    try {
      const { data } = await api.get(`/clash/games/${id}`);
      setGame(data.state);
      if (data.state.status === "finished") localStorage.removeItem("upnex_clash");
      return data.state;
    } catch {
      if (!quiet) {
        setGame(null);
        localStorage.removeItem("upnex_clash");
      }
      return null;
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const { data } = await api.get("/clash/leaderboard");
      setLeaderboard(data.users || []);
    } catch {
      setLeaderboard([]);
    }
  }, []);

  useEffect(() => {
    if (!user || user.guest) return;
    loadLeaderboard();
    const stored = localStorage.getItem("upnex_clash");
    const pending = sessionStorage.getItem("clash_pending");
    if (pending) {
      sessionStorage.removeItem("clash_pending");
      setPendingJoin(pending);
    } else if (stateCode) {
      setPendingJoin(stateCode);
    } else if (stored) {
      refreshGame(stored, { quiet: true });
    }
  }, [user, stateCode, loadLeaderboard, refreshGame]);

  // Poll while the arena is live.
  useEffect(() => {
    if (!game || (game.status !== "waiting" && game.status !== "active")) return undefined;
    pollRef.current = setInterval(() => refreshGame(game.id, { quiet: true }), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [game, game?.id, game?.status, refreshGame]);

  // Question countdown.
  useEffect(() => {
    const deadline = game?.status === "active" ? new Date(game.current?.deadline).getTime() : null;
    if (!deadline) return undefined;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [game?.status, game?.qIndex, game?.current?.deadline]);

  // Reset the answer reveal when the server advances the question.
  useEffect(() => {
    setPicked(null);
  }, [game?.qIndex]);

  // Auto-join when a code arrives and we're signed in.
  useEffect(() => {
    if (!user || user.guest) return;
    if (pendingJoin && !game) {
      handleJoin(pendingJoin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJoin, user, game]);

  const handleJoin = useCallback(async (code) => {
    try {
      const { data } = await api.post("/clash/games/join", { code });
      const state = await refreshGame(data.id);
      if (state) setPendingJoin("");
      localStorage.setItem("upnex_clash", data.id);
    } catch (error) {
      setFlash(messageFrom(error, t("clash.joinFailed", "Could not join that arena.")));
      setPendingJoin("");
      setJoinInput("");
    }
  }, [refreshGame, t]);

  const createArena = async () => {
    try {
      const { data } = await api.post("/clash/games");
      setGame({ status: "waiting", id: data.game.id, code: data.game.code });
      localStorage.setItem("upnex_clash", data.game.id);
    } catch (error) {
      setFlash(messageFrom(error, t("clash.createFailed", "Could not create an arena.")));
    }
  };

  const startArena = async () => {
    try {
      await api.post(`/clash/games/${game.id}/start`);
      const state = await refreshGame(game.id);
      void state;
    } catch (error) {
      setFlash(messageFrom(error, t("clash.startFailed", "A second player is needed to start.")));
    }
  };

  const submitAnswer = async (answerIndex) => {
    if (!game?.current || picked) return;
    const qIndex = game.current.qIndex;
    try {
      const { data } = await api.post(`/clash/games/${game.id}/answer`, {
        qIndex,
        answerIndex,
        timeLeft: secondsLeft
      });
      setPicked({ qIndex, pickedIndex: answerIndex, correctIndex: data.correctIndex, correct: data.correct, points: data.points });
      setGame((current) =>
        current ? { ...current, scoreHost: data.scores.host, scoreGuest: data.scores.guest } : current
      );
    } catch (error) {
      setFlash(messageFrom(error, t("clash.answerFailed", "Could not submit your answer. Try again.")));
    }
  };

  const copyInvite = () => {
    const text = `${window.location.origin}/clash?code=${game?.code}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const reset = () => {
    setGame(null);
    setPicked(null);
    setPendingJoin("");
    setJoinInput("");
    setQuiz(null);
    setQuizNotes(null);
    setQuizAnswers(null);
    setQuizPanel(false);
    localStorage.removeItem("upnex_clash");
    loadLeaderboard();
  };

  const onQuizFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setQuizBusy(true);
    setFlash("");
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/clash/quizpdf", form, { timeout: 120000 });
      setQuiz(data.questions);
      setQuizNotes(data.notes);
      setQuizAnswers(data.questions.map((q) => q.answer));
      setQuizPanel(true);
    } catch (error) {
      setFlash(messageFrom(error, t("clash.pdfFail", "Could not read that quiz.")));
    } finally {
      setQuizBusy(false);
    }
  };

  const applyQuiz = async () => {
    if (!quiz || quizAnswers.some((a) => a < 0)) {
      setFlash(t("clash.pdfNeedsAns", "Mark the correct answer for every question first."));
      return;
    }
    try {
      const questions = quiz.map((q, qi) => ({ prompt: q.prompt, options: q.options, answer: quizAnswers[qi] }));
      const { data } = await api.post(`/clash/games/${game.id}/questions`, { questions });
      setGame(data.state);
      setQuizPanel(false);
      setQuiz(null);
      setQuizNotes(null);
      setQuizAnswers(null);
    } catch (error) {
      setFlash(messageFrom(error, t("clash.pdfUseFail", "Could not save those questions.")));
    }
  };

  const clearPdfQuiz = async () => {
    try {
      const { data } = await api.post(`/clash/games/${game.id}/questions`, { questions: null });
      setGame(data.state);
    } catch (error) {
      setFlash(messageFrom(error, t("clash.pdfResetFail", "Could not switch quizzes.")));
    }
  };

  const removeQuizQ = (qi) => {
    if (quiz.length <= 1) {
      setFlash(t("clash.pdfMinOne", "Keep at least one question."));
      return;
    }
    setQuiz((prev) => prev.filter((_, i) => i !== qi));
    setQuizAnswers((prev) => prev.filter((_, i) => i !== qi));
  };

  const discardQuiz = () => {
    setQuiz(null);
    setQuizNotes(null);
    setQuizAnswers(null);
    setQuizPanel(false);
  };

  // Abandon the current arena and fall back to the lobby (room-code + create).
  // Leaving a live match forfeits it to the rival; leaving a waiting room just
  // closes it.
  const leaveToLobby = async () => {
    if (!game) {
      reset();
      return;
    }
    const forfeit = game.status === "active";
    if (forfeit && !window.confirm(t("clash.leaveConfirm", "Leave the match? Your rival takes the win."))) return;
    try {
      await api.post(`/clash/games/${game.id}/abandon`);
    } catch (error) {
      setFlash(messageFrom(error, t("clash.leaveFail", "Could not leave the arena.")));
      return;
    }
    reset();
  };

  const requireSignIn = !user || user.guest;

  // -------- anonymous gate --------
  if (loading) return <div className="clash-shell"><ScreenSplash /></div>;
  if (requireSignIn) {
    return (
      <div className="clash-shell">
<ClashHeader user={user} onLeave={phase === "lobby" || phase === "duel" ? leaveToLobby : undefined} />
        <section className="clash-signin">
          <Swords size={40} />
          <h2>{t("clash.signinTitle", "Challenge a friend. Climb the arena.")}</h2>
          <p>{t("clash.signinHint", "Sign in to create arenas, invite friends and earn arena points.")}</p>
          <button
            type="button"
            className="clash-primary"
            onClick={() => {
              if (stateCode) sessionStorage.setItem("clash_pending", stateCode);
              navigate("/login");
            }}
          >
            {t("clash.signin", "Sign in to play")}
          </button>
        </section>
      </div>
    );
  }

  // -------- arena screens --------
  const phase = game?.status === "waiting" ? "lobby" : game?.status === "active" ? "duel" : game?.status === "finished" ? "results" : "home";

  return (
    <div className="clash-shell">
      <ClashHeader user={user} />
      {flash && <div className="clash-flash"><button type="button" onClick={() => setFlash("")} aria-label="dismiss">×</button>{flash}</div>}

      {phase === "home" && (
        <section className="clash-home">
          <div className="clash-hero">
            <span className="clash-kicker">UPNEX ARENA</span>
            <h1>{t("clash.heroTitle", "Learn fast. Clash harder.")}</h1>
            <p>{t("clash.heroSub", "Invite a friend, answer 5 live questions, and the highest score takes the arena points. Winner takes 12.")}</p>
            <div className="clash-hero-actions">
              <button type="button" className="clash-primary" onClick={createArena}>
                <Swords size={17} /> {t("clash.createArena", "Create an arena")}
              </button>
              <div className="clash-join-inline">
                <input
                  value={joinInput}
                  onChange={(event) => setJoinInput(event.target.value.toUpperCase().slice(0, 8))}
                  placeholder={t("clash.roomCode", "ROOM CODE")}
                  aria-label={t("clash.roomCode", "ROOM CODE")}
                />
                <button type="button" className="clash-secondary" onClick={() => joinInput && handleJoin(joinInput)} disabled={joinInput.length < 4}>
                  {t("clash.join", "Join")}
                </button>
              </div>
            </div>
            <div className="clash-points"><Zap size={15} /> {user?.clashPoints ?? 0} <em>{t("clash.arenaPoints", "arena points")}</em></div>
          </div>

          <div className="clash-panels">
            <section className="clash-leaderboard">
              <div className="clash-panel-head"><Trophy size={17} /> <h3>{t("clash.leaderboard", "Arena leaderboard")}</h3></div>
              {leaderboard.length ? (
                <ol className="clash-rankings">
                  {leaderboard.map((entry, index) => (
                    <li key={entry.id} className={entry.id === user?.id ? "me" : ""}>
                      <span className="clash-rank">{index === 0 ? <Crown size={16} /> : index + 1}</span>
                      <Initials name={entry.name} side={index === 0 ? "gold" : ""} />
                      <span className="clash-name">{entry.name}</span>
                      <span className="clash-rank-meta"><b>{entry.clashPoints}</b> pts · {entry.clashWins} wins</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="clash-empty">{t("clash.noGames", "No games played yet. Create an arena and be the first.")}</p>
              )}
            </section>

            <section className="clash-how">
              <h3>{t("clash.howTitle", "How it works")}</h3>
              <ol>
                <li><b>{t("clash.step1", "Create & invite")}</b> — {t("clash.step1Sub", "You get a room code. Send the link to a friend.")}</li>
                <li><b>{t("clash.step2", "Go live")}</b> — {t("clash.step2Sub", "Both answer the same 5 questions, 20 seconds each.")}</li>
                <li><b>{t("clash.step3", "Winner takes all")}</b> — {t("clash.step3Sub", "Highest score wins arena points. Rematch!")}</li>
              </ol>
            </section>
          </div>
        </section>
      )}

      {phase === "lobby" && (
        <section className="clash-lobby">
          <div className="clash-lobby-top">
            <div>
              <span className="clash-kicker">ROOM {game.code}</span>
              <h2>{game.guest ? t("clash.friendReady", "Your rival is here!") : t("clash.waitingFriend", "Waiting for your friend…")}</h2>
              <p>{t("clash.inviteHint", "Share this link — they open it, sign in, and land straight in your arena.")}</p>
              <button type="button" className="clash-copy" onClick={copyInvite}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t("clash.copied", "Copied!") : `${window.location.origin}/clash?code=${game.code}`}
              </button>
            </div>
            <div className="clash-versus">
              <div className="clash-fighter"><Initials name={user?.name} side="gold" /><b>{user?.name}</b><small>{t("clash.you", "You")}</small></div>
              <span className="clash-vs">VS</span>
              <div className="clash-fighter"><Initials name={game.guest?.name} /><b>{game.guest?.name || "…"}</b><small>{t("clash.guest", "Guest")}</small></div>
            </div>
          </div>
          {game.guest ? (
            <button type="button" className="clash-start" onClick={startArena}><Play size={17} /> {t("clash.startNow", "Start the clash")}</button>
          ) : (
            <p className="clash-waiting">{t("clash.waitingText", "Ping your friend on WhatsApp — the arena starts the moment they join.")}</p>
          )}
          {game.host?.id === user?.id && (
            <div className="clash-pdf-zone">
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" hidden onChange={onQuizFile} />
              {game.source === "pdf" ? (
                <div className="clash-pdf-loaded">
                  <span className="clash-pdf-badge"><FileUp size={14} /> {t("clash.pdfBadgeOn", "Using your uploaded quiz")} · {game.questionCount} {t("clash.questions", "questions")}</span>
                  <button type="button" className="clash-link-btn" onClick={clearPdfQuiz}>{t("clash.pdfReset", "Use the random quiz instead")}</button>
                </div>
              ) : (
                <div className="clash-pdf-empty">
                  <button type="button" className="clash-secondary" onClick={() => fileRef.current?.click()} disabled={quizBusy}>
                    <FileUp size={15} /> {quizBusy ? t("clash.pdfReading", "Reading your paper…") : t("clash.pdfImport", "Import questions from a PDF / photo")}
                  </button>
                  <p className="clash-pdf-hint">{t("clash.pdfHint", "Upload a question paper — we read the MCQs, auto-detect the answer key if it's printed, and you confirm the answers before the clash.")}</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {phase === "duel" && game.current && (
        <section className="clash-duel">
          <ScoreBar game={game} meId={user?.id} />
          <div className="clash-question-card">
            <div className="clash-q-meta">
              <span>{t("clash.question", "Question")} {game.current.qIndex + 1} / {game.current.total}</span>
              <span className={`clash-timer ${secondsLeft <= 5 ? "urgent" : ""}`}><Timer size={14} /> {secondsLeft}s</span>
              <span className="clash-category">{game.current.category}</span>
            </div>
            <h3>{game.current.prompt}</h3>
            <div className="clash-options">
              {game.current.options.map((option, index) => {
                const locked = Boolean(picked);
                const isPicked = picked?.pickedIndex === index;
                const isCorrect = picked?.correctIndex === index;
                let cls = "clash-option";
                if (locked && isCorrect) cls += " correct";
                if (locked && isPicked && !isCorrect) cls += " wrong";
                return (
                  <button
                    type="button"
                    key={index}
                    className={cls}
                    disabled={locked}
                    onClick={() => submitAnswer(index)}
                  >
                    <span className="clash-option-letter">{(index + 10).toString(36).toUpperCase()}</span>
                    {option}
                    {locked && isCorrect && <Check size={17} />}
                  </button>
                );
              })}
            </div>
            {picked && (
              <div className={`clash-reveal ${picked.correct ? "win" : "lose"}`}>
                {picked.correct
                  ? <span><Check size={16} /> {t("clash.correct", "Correct!")} <b>+{picked.points}</b></span>
                  : <span>{t("clash.wrong", "Not quite.")} · </span>}
                <em>{picked.correct ? t("clash.waitOpponent", "Waiting for your rival…") : t("clash.waitOpponent", "Waiting for your rival…")}</em>
              </div>
            )}
          </div>
        </section>
      )}

      {phase === "duel" && !game.current && (
        <div className="clash-splash"><Swords size={42} /><p>{t("clash.loading", "Loading the arena…")}</p></div>
      )}

      {phase === "results" && (
        <section className="clash-results">
          <div className="clash-result-hero">
            <span className="clash-kicker">ARENA CLOSED</span>
            <h2>
              {game.winner
                ? game.winner.id === user?.id
                  ? t("clash.youWon", "You take the arena!")
                  : t("clash.theyWon", "{{name}} takes the arena.", { name: game.winner.name })
                : t("clash.draw", "A dead heat — draw!")}
            </h2>
            <ScoreBar game={game} meId={user?.id} big />
            <p className="clash-result-points">
              +{game.winner ? (game.winner.id === user?.id ? 12 : 3) : 7} {t("clash.arenaPoints", "arena points")} ·{" "}
              {t("clash.rematch", "Rematch keeps the streak alive.")}
            </p>
          </div>
          <div className="clash-review">
            <h3>{t("clash.review", "Round by round")}</h3>
            {game.results?.map((result) => {
              const hostIsMe = game.host?.id === user?.id;
              const mine = hostIsMe ? result.hostCorrect : result.guestCorrect;
              const theirs = hostIsMe ? result.guestCorrect : result.hostCorrect;
              return (
                <div className={`clash-round ${mine ? "mine-good" : "mine-bad"}`} key={result.qIndex}>
                  <span className="clash-round-num">Q{result.qIndex + 1}</span>
                  <div className="clash-round-body">
                    <b>{result.prompt}</b>
                    <span className="clash-round-tags">
                      <em>{mine ? "✓ you" : "✗ you"}</em>
                      <em>{theirs ? "✓ rival" : "✗ rival"}</em>
                      <small>{result.category}</small>
                    </span>
                  </div>
                  <span className="clash-round-score">{result.hostPoints + result.guestPoints}</span>
                </div>
              );
            })}
          </div>
          <div className="clash-result-actions">
            <button type="button" className="clash-primary" onClick={reset}><RotateCcw size={16} /> {t("clash.backArena", "Back to the arena lobby")}</button>
            <button type="button" className="clash-secondary" onClick={createArena}><Swords size={15} /> {t("clash.playAgain", "Play again")}</button>
          </div>
        </section>
      )}

      {quizPanel && quiz && (
        <div className="clash-overlay" role="dialog" aria-modal="true" aria-label={t("clash.pdfReviewTitle", "Review your questions")}>
          <div className="clash-review-card">
            <div className="clash-review-head">
              <h3>{t("clash.pdfReviewTitle", "Review your questions")}</h3>
              <p>{t("clash.pdfReviewSub", "Mark the correct answer for each one — it decides who scores the points.")}</p>
              {quizNotes?.answerKeyFound ? (
                <p className="clash-pdf-note"><Check size={13} /> {t("clash.pdfKeyFound", "Answer key detected — correct answers were pre-filled.")}</p>
              ) : (
                <p className="clash-pdf-note">{t("clash.pdfNoKey", "No answer key found — mark the correct answer for each question.")}</p>
              )}
              {quizNotes?.truncated && <p className="clash-pdf-note">{t("clash.pdfTruncated", "Only the first 10 questions were used.")}</p>}
            </div>
            <ol className="clash-pdf-qs">
              {quiz.map((q, qi) => (
                <li key={qi} className="clash-pdf-q">
                  <div className="clash-pdf-q-body">
                    <b>{qi + 1}. {q.prompt}</b>
                    <div className="clash-pdf-opts">
                      {q.options.map((option, oi) => (
                        <button
                          type="button"
                          key={oi}
                          className={quizAnswers?.[qi] === oi ? "picked" : ""}
                          onClick={() => setQuizAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
                        >
                          {(oi + 10).toString(36).toUpperCase()}. {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="button" className="clash-pdf-del" onClick={() => removeQuizQ(qi)} aria-label="remove question">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ol>
            <div className="clash-review-actions">
              <span className="clash-pdf-meta">
                {quiz.length} {t("clash.questions", "questions")} ·{" "}
                {quizAnswers.some((a) => a < 0)
                  ? `${quizAnswers.filter((a) => a < 0).length} ${t("clash.pdfNeedMark", "need an answer")}`
                  : t("clash.pdfAllAnswered", "all answers marked")}
              </span>
              <button type="button" className="clash-secondary" onClick={discardQuiz}>{t("clash.pdfCancel", "Cancel")}</button>
              <button type="button" className="clash-primary" onClick={applyQuiz} disabled={quizAnswers.some((a) => a < 0)}>
                <Play size={15} /> {t("clash.pdfUse", "Use these questions")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClashHeader({ user, onLeave }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <header className="clash-header">
      <button type="button" className="clash-brand" onClick={() => navigate("/dashboard")}>
        <Mark /><b>UPNEX</b><em>CLASH</em>
      </button>
      <div className="clash-header-right">
        {onLeave && (
          <button type="button" className="clash-leave" onClick={onLeave}>
            <LogOut size={14} /> {t("clash.leaveToLobby", "Leave to lobby")}
          </button>
        )}
        <span className="clash-header-points"><Swords size={14} /> {user?.clashPoints ?? 0}</span>
        <Initials name={user?.name} side="gold" />
      </div>
    </header>
  );
}

function ScoreBar({ game, meId, big }) {
  const { t } = useTranslation();
  const hostIsMe = game.host?.id === meId;
  return (
    <div className={`clash-scorebar ${big ? "big" : ""}`}>
      <span className="clash-score-name"><Initials name={game.host?.name} side="gold" />{hostIsMe ? t("clash.you", "You") : game.host?.name}</span>
      <span className="clash-score-counts"><b>{game.scoreHost}</b> : <b>{game.scoreGuest}</b></span>
      <span className="clash-score-name right">{hostIsMe ? game.guest?.name || "…" : t("clash.you", "You")}</span>
    </div>
  );
}

function ScreenSplash() {
  return (
    <div className="clash-signin">
      <div className="clash-loading-dots"><i /><i /><i /></div>
      <p>Entering the arena…</p>
    </div>
  );
}