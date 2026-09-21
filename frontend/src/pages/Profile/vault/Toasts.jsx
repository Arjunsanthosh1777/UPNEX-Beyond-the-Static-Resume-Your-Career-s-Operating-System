import { useCallback, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((text, kind = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [...current.slice(-3), { id, text, kind }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 4500));
  }, [dismiss]);

  return { toasts, push, dismiss };
}

export function Toasts({ toasts, dismiss }) {
  const { t } = useTranslation();
  if (!toasts.length) return null;
  return (
    <div className="vault-toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`vault-toast vault-toast-${toast.kind}`} key={toast.id}>
          {toast.kind === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
          <button type="button" onClick={() => dismiss(toast.id)} aria-label={t("vault.dismiss", "Dismiss notification")}>×</button>
        </div>
      ))}
    </div>
  );
}