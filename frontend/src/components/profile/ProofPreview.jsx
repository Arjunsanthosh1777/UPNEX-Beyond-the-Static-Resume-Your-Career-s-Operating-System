import { useTranslation } from "react-i18next";
import { BadgeCheck, CalendarDays, ShieldCheck } from "lucide-react";

const ACCENT = {
  MARKSHEET: "#7c4dff",
  CERTIFICATE: "#0f9d6b",
  TRANSCRIPT: "#2e7fd6",
  RECOMMENDATION: "#d97b1e"
};

function fmtDate(value) {
  try {
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(value || "");
  }
}

// Public "proof of record" for a verified credential that has no original file
// (or whose original must stay private). Rendering a branded, watermarked card
// instead of the document is deliberate: recruiters see evidence, not files.
export default function ProofPreview({ document }) {
  const { t } = useTranslation();
  // Accepts both vault-document shape and the public-profile credential shape.
  const title = document.fileName || document.title;
  const type = String(document.documentType || document.type || "document");
  const date = document.createdAt || document.date;
  const accent = ACCENT[type.toUpperCase()] || "#7c4dff";
  const id = document.verificationId;

  return (
    <div className="proof-card" style={{ "--proof-accent": accent }}>
      <svg className="proof-watermark" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id="proof-wm" width="230" height="230" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
            <text x="6" y="118" fontSize="30" fontWeight="800" fill="rgba(140,120,255,0.10)">UPNEX VERIFIED</text>
            <text x="10" y="210" fontSize="22" fill="rgba(140,120,255,0.07)">upnex.ai/{id}</text>
          </pattern>
        </defs>
        <rect width="400" height="520" fill="url(#proof-wm)" />
      </svg>

      <div className="proof-seal"><ShieldCheck size={26} /></div>
      <span className="proof-type">{t(`documentTypes.${type.toLowerCase()}`, type)}</span>
      <h3>{title}</h3>
      {document.issuer && <p className="proof-issuer">{document.issuer}</p>}
      {date && (
        <p className="proof-date"><CalendarDays size={12} /> {t("proof.issuedOn", "Verified on")} {fmtDate(date)}</p>
      )}
      {id && <code>{id}</code>}
      <div className="proof-foot">
        <BadgeCheck size={14} /> {t("proof.verifiedByUpnex", "Verified by UPNEX")}
      </div>
    </div>
  );
}