import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, CheckCircle2, Info, KeyRound, ShieldCheck, UploadCloud } from "lucide-react";
import api from "../services/api";

const TYPE_ICON = { login: KeyRound, verify: ShieldCheck, upload: UploadCloud, system: Info };

function timeAgo(iso) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "now";
  const minutes = Math.round(diff / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Header bell: polls an unread count every 30s, shows a popover of the latest
// notifications, deep-links where the type points and marks individual rows
// read on visit (or all at once).
export default function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);

  const refreshCount = useCallback(() => {
    api.get("/notifications/unread-count")
      .then((res) => setCount(res.data.count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, 30000);
    return () => window.clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get("/notifications")
      .then((res) => setItems(res.data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    function onDocClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function markAllRead() {
    await api.post("/notifications/read", { all: true }).catch(() => {});
    setItems((list) => list.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setCount(0);
  }

  function visit(n) {
    if (!n.readAt) {
      api.post("/notifications/read", { id: n.id })
        .then(() => setCount((c) => Math.max(0, c - 1)))
        .catch(() => {});
    }
    setOpen(false);
  }

  return (
    <div className="notif-root" ref={rootRef}>
      <button type="button" className="notif-trigger" onClick={() => setOpen((v) => !v)} aria-label={t("nav.notifications", "Notifications")} aria-expanded={open}>
        <Bell size={17} />
        {count > 0 && <span className="notif-badge">{count > 9 ? "9+" : count}</span>}
      </button>

      {open && (
        <div className="notif-pop">
          <div className="notif-pop-head">
            <b>{t("nav.notifications", "Notifications")}</b>
            {count > 0 && (
              <button type="button" className="notif-markall" onClick={markAllRead}>
                <CheckCheck size={14} /> {t("nav.markAllRead", "Mark all read")}
              </button>
            )}
          </div>
          <div className="notif-list">
            {loading && <div className="notif-empty"><CheckCircle2 size={18} /> {t("common.loading", "LOADING…")}</div>}
            {!loading && items.length === 0 && (
              <div className="notif-empty"><CheckCircle2 size={18} /> {t("nav.noNotifications", "You're all caught up.")}</div>
            )}
            {!loading && items.map((n) => {
              const Icon = TYPE_ICON[n.type] || Info;
              return (
                <Link key={n.id} className={`notif-item ${n.readAt ? "read" : "unread"}`} to={n.link || "/dashboard"} onClick={() => visit(n)}>
                  <span className="notif-icon"><Icon size={15} /></span>
                  <span className="notif-body">
                    <b>{n.title}</b>
                    {n.message && <small>{n.message}</small>}
                  </span>
                  <span className="notif-time">{timeAgo(n.createdAt)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}