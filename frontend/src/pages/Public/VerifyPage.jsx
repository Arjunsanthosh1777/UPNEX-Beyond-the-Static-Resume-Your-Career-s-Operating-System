import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { BadgeCheck, Check, Copy, FileText, ShieldCheck } from "lucide-react";
import { Mark } from "../../components/Logo";
import api from "../../services/api";
import NotFound from "../NotFound/NotFound";

const VERIFY_PATTERN = /^UPX-[A-Z0-9]{8}$/i;

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(value || "");
  }
}

export default function VerifyPage() {
  const { t } = useTranslation();
  const { verificationId: raw } = useParams();
  const verificationId = String(raw || "").trim().replace(/^upx-/i, "UPX-").toUpperCase();
  const [state, setState] = useState({ phase: "loading", data: null });
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  const verifyUrl = `${window.location.origin}/verify/${verificationId}`;

  useEffect(() => {
    if (!VERIFY_PATTERN.test(verificationId)) {
      setState({ phase: "missing", data: null });
      return;
    }
    let cancelled = false;
    setState({ phase: "loading", data: null });
    api
      .get(`/public/verify/${encodeURIComponent(verificationId)}`)
      .then((res) => {
        if (!cancelled) setState({ phase: "ready", data: res.data });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404) setState({ phase: "missing", data: null });
        else setState({ phase: "error", data: null });
      });
    return () => { cancelled = true; };
  }, [verificationId]);

  useEffect(() => {
    if (!qrRef.current || state.phase !== "ready") return undefined;
    QRCode.toCanvas(qrRef.current, verifyUrl, {
      width: 168,
      margin: 1,
      color: { dark: "#171b23", light: "#ffffff" },
      errorCorrectionLevel: "M"
    }).catch(() => {});
    return undefined;
  }, [state.phase, verifyUrl]);

  function copyLink() {
    const done = () => setCopied(true);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(verifyUrl).then(done).catch(done);
      } else {
        const area = document.createElement("textarea");
        area.value = verifyUrl;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
        done();
      }
    } catch {
      done();
    }
    window.setTimeout(() => setCopied(false), 2200);
  }

  if (state.phase === "missing") return <NotFound />;

  if (state.phase === "error") {
    return (
      <main className="verify-page">
        <div className="verify-shell">
          <div className="verify-card">
            <div className="verify-card-x">!</div>
            <h1>{t("verify.loadFailed", "Couldn't verify this document.")}</h1>
            <p>{t("verify.loadFailedSub", "UPNEX is having trouble reaching its servers. Please try again in a moment.")}</p>
            <Link className="nf-home" to="/">{t("common.backToUpnex", "Back to UPNEX")}</Link>
          </div>
        </div>
      </main>
    );
  }

  if (state.phase !== "ready") {
    return <div className="screen-loader">{t("common.loading", "LOADING…")}</div>;
  }

  const { verificationId: id, student, document: doc } = state.data;

  return (
    <main className="verify-page">
      <div className="verify-shell">
        <Link to="/" className="verify-brand" aria-label={t("home.homeAria", "UPNEX home")}>
          <Mark />
          <span>UPNEX</span>
        </Link>

        <div className="verify-card">
          <div className="verify-badge">
            <ShieldCheck size={30} />
          </div>
          <h1>{t("verify.title", "Verified document")}</h1>
          <p className="verify-sub">{t("verify.sub", "This credential was checked through UPNEX's verification.")}</p>

          <div className="verify-id-row">
            <code>{id}</code>
            <span className="verify-ok"><BadgeCheck size={14} /> {t("common.verified", "✓ Verified")}</span>
          </div>

          <div className="verify-doc">
            <div className="verify-doc-icon"><FileText size={20} /></div>
            <div>
              <strong>{doc.name}</strong>
              <span className="verify-doc-meta">
                <em>{doc.type}</em>
                {doc.issuer && <em>{doc.issuer}</em>}
                <em>{formatDate(doc.issuedAt)}</em>
              </span>
            </div>
          </div>

          <div className="verify-qr-row">
            <div className="verify-qr" aria-label="QR code that opens this verification page">
              <canvas ref={qrRef} width={168} height={168} />
            </div>
            <div className="verify-qr-copy">
              <p>{t("verify.issuedTo", "Issued to")}</p>
              <strong>{student.name}</strong>
              {student.username && (
                <Link to={`/${student.username}`} className="verify-handle">@{student.username}</Link>
              )}
            </div>
          </div>

          <button type="button" className={copied ? "verify-copy ok" : "verify-copy"} onClick={copyLink}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? t("verify.copied", "Copied") : t("verify.copyLink", "Copy verify link")}
          </button>

          <p className="verify-note">
            {t("verify.note", "This page confirms the document was uploaded by {{name}} and passed UPNEX's verification. The document's contents stay private.", { name: student.name })}
          </p>
        </div>

        <p className="verify-foot">
          <Link to="/">← {t("publicProfile.backToUpnex", "Back to UPNEX")}</Link>
        </p>
      </div>
    </main>
  );
}