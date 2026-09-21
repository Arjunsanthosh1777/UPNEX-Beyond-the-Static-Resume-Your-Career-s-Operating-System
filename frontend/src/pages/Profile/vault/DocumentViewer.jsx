import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check, ChevronLeft, ChevronRight, Copy, Download, Eye, FileText, Link2, Lock,
  Maximize2, Minimize2, Printer, X
} from "lucide-react";
import PdfViewer from "./PdfViewer";
import ProofPreview from "../../../components/profile/ProofPreview";
import { downloadDocument, formatBytes, formatDate, getDocumentAccess } from "./vaultUtils";
import { useTranslation } from "react-i18next";

function ImageViewer({ url, onPrint }) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  return (
    <div className="image-stage">
      <img
        src={url}
        alt={t("vault.imageAlt", "Document preview")}
        style={{ transform: `scale(${zoom})` }}
        className="image-preview"
        draggable={false}
      />
      <div className="stage-tools stage-tools-image">
        <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label={t("vault.zoomOut", "Zoom out")}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label={t("vault.zoomIn", "Zoom in")}>+</button>
        <button type="button" onClick={() => setZoom(1)} aria-label={t("vault.fitScreen", "Fit to screen")}>Fit</button>
      </div>
    </div>
  );
}

function VerifyLinkRow({ verificationId }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/verify/${verificationId}`;

  function copy() {
    const done = () => setCopied(true);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(done).catch(done);
      } else {
        const area = document.createElement("textarea");
        area.value = url;
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

  return (
    <div className="viewer-verify-row">
      <button type="button" className={copied ? "viewer-verify-btn ok" : "viewer-verify-btn"} onClick={copy}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? t("verify.copied", "Copied") : t("verify.copyLink", "Copy verify link")}
      </button>
      <a className="viewer-verify-btn" href={url} target="_blank" rel="noreferrer noopener">
        <Link2 size={14} /> {t("verify.open", "Open verify page")}
      </a>
    </div>
  );
}

function DetailPanel({ document, pageCount, onEdit, onDelete }) {
  const { t } = useTranslation();
  return (
    <div className="viewer-detail" aria-label={t("vault.documentDetails", "Document details")}>
      <h2>{document.fileName}</h2>
      {document.verified ? (
        <div className="viewer-verified">
          <span>{t("common.verified", "✓ Verified")}</span>
          <small>{t("vault.verificationId", "UPNEX Verification ID:")} <b>{document.verificationId || t("vault.verificationPlaceholder", "UPX-—————")}</b></small>
        </div>
      ) : (
        <span className="pending-chip">{t("common.pendingReview", "PENDING REVIEW")}</span>
      )}

      {document.verified && document.verificationId && <VerifyLinkRow verificationId={document.verificationId} />}

      <dl className="viewer-meta">
        <div><dt>{t("vault.type", "Type")}</dt><dd>{document.documentType}</dd></div>
        <div><dt>{t("vault.uploaded", "Uploaded")}</dt><dd>{formatDate(document.createdAt)}</dd></div>
        <div><dt>{t("vault.size", "Size")}</dt><dd>{formatBytes(document.fileSize)}</dd></div>
        {pageCount ? <div><dt>{t("vault.pages", "Pages")}</dt><dd>{pageCount}</dd></div> : null}
      </dl>

      {document.ocrText && (
        <details className="ocr-panel">
          <summary>{t("vault.viewExtractedInfo", "View Extracted Information")}</summary>
          <pre>{document.ocrText}</pre>
        </details>
      )}

      <div className="viewer-visibility"><Lock size={13} /> {t("vault.privateDoc", "Private — only you can see this document")}</div>

      <div className="viewer-activity">
        <strong>{t("vault.activity", "Document activity")}</strong>
        <ul>
          <li><span>{t("vault.uploaded", "Uploaded")}</span><b>{formatDate(document.createdAt)}</b></li>
          <li><span>{t("vault.previewed", "Previewed")}</span><b>{document.previewCount || 0} {t("vault.times", "times")}</b></li>
          <li><span>{t("vault.downloaded", "Downloaded")}</span><b>{document.downloadCount || 0} {t("vault.times", "times")}</b></li>
          {document.lastAccessedAt && <li><span>{t("vault.lastAccessed", "Last accessed")}</span><b>{formatDate(document.lastAccessedAt)}</b></li>}
        </ul>
      </div>

      <div className="viewer-detail-actions">
        <button type="button" className="app-secondary" onClick={onEdit}>{t("vault.editMetadata", "Edit metadata")}</button>
        <button type="button" className="viewer-danger" onClick={onDelete}>{t("common.delete", "Delete")}</button>
      </div>
    </div>
  );
}

export default function DocumentViewer({ document, onClose, onDownloaded, onEdit, onDelete }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const rootRef = useRef(null);
  const pdfRef = useRef(null);

  const kind = document.previewKind || (document.mime === "application/pdf" ? "pdf" : (document.mime || "").startsWith("image/") ? "image" : "unsupported");

  useEffect(() => {
    if (!document.hasFile) {
      // No original file on disk: verified records show the UPNEX proof card
      // instead; unverified ones fall through to the load-error state.
      setLoadError(!document.verified);
      setUrl(null);
      return undefined;
    }
    let active = true;
    getDocumentAccess(document.id, "preview")
      .then(({ url: accessUrl }) => { if (active) setUrl(accessUrl); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [document.id, document.hasFile, document.verified]);

  const toggleFullscreen = useCallback(() => {
    if (!rootRef.current) return;
    if (window.document.fullscreenElement) {
      window.document.exitFullscreen?.();
    } else {
      rootRef.current.requestFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(window.document.fullscreenElement));
    window.document.addEventListener("fullscreenchange", onChange);
    return () => window.document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const performDownload = () => {
      downloadDocument(document).then(() => onDownloaded?.()).catch(() => {});
    };
    const onKeyDown = (event) => {
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      switch (event.key) {
        case "Escape":
          if (window.document.fullscreenElement) {
            window.document.exitFullscreen?.();
          } else {
            onClose();
          }
          break;
        case "ArrowLeft":
          if (kind === "pdf") { event.preventDefault(); setPage((p) => Math.max(1, p - 1)); }
          break;
        case "ArrowRight":
          if (kind === "pdf") { event.preventDefault(); setPage((p) => Math.min(pageCount || p, p + 1)); }
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "d":
        case "D":
          performDownload();
          break;
        case "p":
        case "P":
          if (kind === "pdf") pdfRef.current?.printCurrentPage();
          break;
        default:
          break;
      }
    };
    window.document.addEventListener("keydown", onKeyDown);
    return () => window.document.removeEventListener("keydown", onKeyDown);
  }, [document, kind, pageCount, onClose, onDownloaded, toggleFullscreen]);

  const download = () => {
    downloadDocument(document).then(() => onDownloaded?.());
  };

  return (
    <div
      ref={rootRef}
      className={`viewer-overlay ${fullscreen ? "viewer-fullscreen" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${document.fileName}`}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <header className="viewer-header">
        <button type="button" className="viewer-back" onClick={onClose}>
          <ChevronLeft size={17} /> Back
        </button>
        <div className="viewer-title">
          <FileText size={16} />
          <span>{document.fileName}</span>
          {document.verified && <i className="viewer-badge">{t("common.verified", "✓ Verified")}</i>}
        </div>
        <div className="viewer-actions">
          {kind === "pdf" && (
            <button type="button" className="viewer-icon" onClick={() => pdfRef.current?.printCurrentPage()} aria-label={t("vault.printDoc", "Print document")} title={t("vault.printDoc", "Print document")}><Printer size={15} /></button>
          )}
          <button type="button" className="viewer-icon" onClick={() => setSideOpen((v) => !v)} aria-label={t("vault.toggleDetails", "Toggle document details")} title={t("vault.toggleDetails", "Toggle document details")}><Eye size={15} /></button>
          <button type="button" className="viewer-icon" onClick={download} aria-label={t("vault.downloadDoc", "Download document")} title={t("vault.downloadDoc", "Download document")}><Download size={15} /></button>
          <button type="button" className="viewer-icon" onClick={toggleFullscreen} aria-label={t("vault.toggleFullscreen", "Toggle fullscreen")} title={t("vault.toggleFullscreen", "Toggle fullscreen")}>{fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
          <button type="button" className="viewer-icon" onClick={onClose} aria-label={t("vault.closePreview", "Close preview")} title={t("vault.closePreview", "Close preview")}><X size={15} /></button>
        </div>
      </header>

      <div className={`viewer-body ${sideOpen ? "side-open" : ""}`}>
        <main className="viewer-stage-wrap">
          {loadError && (
            <div className="viewer-error" role="alert">
              <strong>{t("vault.viewerLoadError", "Document preview unavailable")}</strong>
              <span>{t("vault.viewerLoadErrorSub", "We could not display this document here.")}</span>
              <button type="button" className="app-primary" onClick={download}>{t("vault.downloadDoc", "Download document")}</button>
              <button type="button" className="app-secondary" onClick={() => { setLoadError(false); setUrl(null); setTimeout(() => getDocumentAccess(document.id, "preview").then(({ url: u }) => setUrl(u)).catch(() => setLoadError(true)), 0); }}>{t("common.tryAgain", "Try again")}</button>
            </div>
          )}
          {!loadError && url && kind === "pdf" && (
            <PdfViewer url={url} page={page} onReady={setPageCount} ref={pdfRef} />
          )}
          {!loadError && url && kind === "image" && <ImageViewer url={url} />}
          {!loadError && url && kind === "unsupported" && (
            <div className="viewer-error viewer-unsupported" role="alert">
              <strong>{t("vault.unsupportedTitle", "This file type cannot be previewed in UPNEX.")}</strong>
              <span>{t("vault.unsupportedFile", "Filename: {{name}}", { name: document.originalName || document.fileName })}</span>
              <div className="viewer-error-actions">
                <button type="button" className="app-primary" onClick={download}>{t("common.download", "Download")}</button>
                <button type="button" className="app-secondary" onClick={onClose}>{t("common.close", "Close")}</button>
              </div>
            </div>
          )}
          {!url && !loadError && document.verified && !document.hasFile && (
            <div className="viewer-stage proof-stage">
              <ProofPreview document={document} />
            </div>
          )}
          {!url && !loadError && !(document.verified && !document.hasFile) && <div className="viewer-loading" role="status">{t("vault.loadingDoc", "Loading document…")}</div>}
        </main>

        <DetailPanel document={document} pageCount={pageCount} onEdit={onEdit} onDelete={onDelete} />
      </div>

      {kind === "pdf" && url && !loadError && (
        <footer className="viewer-footer">
          <button type="button" className="viewer-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft size={15} /> {t("common.previous", "Previous")}</button>
          <span className="viewer-page-indicator">{t("vault.pageOf", "Page {{page}} of {{total}}", { page, total: pageCount || "…" })}</span>
          <button type="button" className="viewer-page-btn" onClick={() => setPage((p) => Math.min(pageCount || p, p + 1))} disabled={page >= (pageCount || 1)}>{t("common.next", "Next")} <ChevronRight size={15} /></button>
          <button type="button" className="viewer-download-btn" onClick={download}><Download size={14} /> {t("common.download", "Download")}</button>
        </footer>
      )}
      {kind === "image" && url && !loadError && (
        <footer className="viewer-footer">
          <span className="viewer-page-indicator">{document.fileName}</span>
          <button type="button" className="viewer-download-btn" onClick={download}><Download size={14} /> {t("common.download", "Download")}</button>
        </footer>
      )}
    </div>
  );
}