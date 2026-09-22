import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, BadgeCheck, CheckCircle2, FileClock, ShieldCheck, X } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { ScreenLoader } from "../../components/Loading";

function fmtDate(value) {
  try {
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(value || "");
  }
}

// Staff-only review queue: every pending vault upload lands here, and approving
// stamps the verification ID + issuer, then notifies + emails the owner. The
// role guard fails closed — non-ADMIN/TEACHER see a locked-off screen, no data.
export default function AdminApprovals() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isStaff = Boolean(user && (user.role === "ADMIN" || user.role === "TEACHER"));

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [issuers, setIssuers] = useState({});
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api.get("/admin/documents/pending")
      .then((res) => setDocs(res.data.documents || []))
      .catch((err) => setError(err.response?.data?.message || "Could not load the review queue."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isStaff) load();
  }, [isStaff, load]);

  async function approve(doc) {
    setBusy(doc.id);
    setError("");
    try {
      const res = await api.post(`/admin/documents/${doc.id}/approve`, {
        issuer: (issuers[doc.id] || "").trim() || undefined
      });
      setMessage(`${res.data.document.fileName} verified — ${res.data.document.verificationId}. The owner has been notified.`);
      setDocs((list) => list.filter((d) => d.id !== doc.id));
    } catch (err) {
      setError(err.response?.data?.message || "Could not approve this document.");
    } finally {
      setBusy(null);
    }
  }

  if (!user) return <ScreenLoader label={t("common.loadingApp", "Loading UPNEX...")} />;

  if (!isStaff) {
    return (
      <div className="staff-only">
        <div className="staff-lock"><ShieldCheck size={30} /></div>
        <h1>{t("admin.staffOnlyTitle", "Staff area")}</h1>
        <p>{t("admin.staffOnlySub", "Document verification is only available to UPNEX reviewers.")}</p>
        <Link to="/dashboard">{t("admin.backToDashboard", "Back to dashboard")}</Link>
      </div>
    );
  }

  return (
    <div className="admin-scene">
      <header className="admin-head">
        <div>
          <div className="admin-kicker"><ShieldCheck size={14} /> {t("admin.kicker", "UPNEX REVIEW")}</div>
          <h1>{t("admin.title", "Document verification")}</h1>
          <p>{t("admin.subtitle", "Review pending uploads and issue verification IDs.")}</p>
        </div>
        <Link className="admin-back" to="/dashboard"><ArrowLeft size={15} /> {t("admin.backToDashboard", "Back to dashboard")}</Link>
      </header>

      {(message || error) && (
        <div className={`admin-banner ${error ? "err" : "ok"}`}>
          {error ? <X size={16} /> : <CheckCircle2 size={16} />}
          {error || message}
          <button type="button" onClick={() => { setMessage(""); setError(""); }} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading && <ScreenLoader label={t("common.loading", "LOADING…")} />}

      {!loading && docs.length === 0 && (
        <div className="admin-empty">
          <FileClock size={26} />
          <h3>{t("admin.queueEmpty", "No documents waiting for review")}</h3>
          <p>{t("admin.queueEmptySub", "New uploads appear here automatically.")}</p>
        </div>
      )}

      {!loading && docs.length > 0 && (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.student", "Student")}</th>
                <th>{t("admin.document", "Document")}</th>
                <th>{t("admin.uploaded", "Uploaded")}</th>
                <th>{t("admin.issuer", "Issuer")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <strong>{doc.user?.name || "—"}</strong>
                    <small>@{doc.user?.username || doc.user?.email || ""}</small>
                  </td>
                  <td>
                    <strong>{doc.fileName}</strong>
                    <small className="admin-type">{doc.documentType}</small>
                  </td>
                  <td className="admin-muted">{fmtDate(doc.createdAt)}</td>
                  <td>
                    <input
                      type="text"
                      className="admin-issuer"
                      placeholder={t("admin.issuerPlaceholder", "Issuing body (optional)")}
                      value={issuers[doc.id] || ""}
                      onChange={(event) => setIssuers((map) => ({ ...map, [doc.id]: event.target.value }))}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-approve"
                      disabled={busy === doc.id}
                      onClick={() => approve(doc)}
                    >
                      <BadgeCheck size={15} /> {busy === doc.id ? t("admin.approving", "Verifying…") : t("admin.approve", "Verify")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}