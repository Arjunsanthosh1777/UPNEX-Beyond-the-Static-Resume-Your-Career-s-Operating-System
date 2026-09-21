import { useEffect, useRef, useState } from "react";
import {
  Download, Eye, FileType2, MoreHorizontal, Pencil, Trash2
} from "lucide-react";
import { getDocumentAccess, formatBytes } from "./vaultUtils";
import { getPdfjs } from "./pdfjsLoader";
import { useTranslation } from "react-i18next";

function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold });
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function PdfThumb({ document }) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const [ref, inView] = useInView();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!inView || failed) return;
    let cancelled = false;
    getDocumentAccess(document.id, "preview")
      .then(({ url }) => getPdfjs().then((pdfjs) => pdfjs.getDocument({ url }).promise))
      .then((pdfDoc) => pdfDoc.getPage(1))
      .then(async (page) => {
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const width = 260;
        const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        page.cleanup();
      })
      .catch((error) => {
        console.error("PDF thumbnail failed:", error);
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [document, inView, failed]);

  if (failed) {
    return (
      <div ref={ref} className="card-thumb thumb-icon">
        <FileType2 size={22} />
      </div>
    );
  }

  return (
    <div ref={ref} className="card-thumb thumb-pdf">
      <canvas ref={canvasRef} className="thumb-canvas" />
      {!inView && <span className="thumb-placeholder">{t("vault.thumbPdf", "PDF")}</span>}
    </div>
  );
}

function DocumentMenu({ document, onPreview, onDownload, onEdit, onDelete }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const nodeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (nodeRef.current && !nodeRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    window.document.addEventListener("mousedown", close);
    window.document.addEventListener("keydown", onKey);
    return () => {
      window.document.removeEventListener("mousedown", close);
      window.document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn) => () => { setOpen(false); fn(); };

  return (
    <div className="document-menu" ref={nodeRef}>
      <button
        type="button"
        className="menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={16} />
        <span className="sr-only">{t("vault.menuActions", "Document actions")}</span>
      </button>
      {open && (
        <div className="document-menu-list" role="menu">
          <button type="button" role="menuitem" onClick={run(onPreview)}><Eye size={15} /> {t("vault.menuPreview", "Preview")}</button>
          <button type="button" role="menuitem" onClick={run(onDownload)}><Download size={15} /> {t("vault.menuDownload", "Download")}</button>
          <button type="button" role="menuitem" onClick={run(onEdit)}><Pencil size={15} /> {t("vault.menuEdit", "Edit details")}</button>
          <button type="button" role="menuitem" className="menu-danger" onClick={run(onDelete)}><Trash2 size={15} /> {t("vault.menuDelete", "Delete")}</button>
        </div>
      )}
    </div>
  );
}

export default function DocumentCard({ document, onPreview, onDownload, onEdit, onDelete, selected, onToggleSelect }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(null);
  const hasFile = Boolean(document.hasFile);
  const kind = document.previewKind || "unsupported";

  useEffect(() => {
    if (!hasFile || kind !== "image") return;
    let active = true;
    getDocumentAccess(document.id, "preview").then(({ url: u }) => { if (active) setUrl(u); }).catch(() => {});
    return () => { active = false; };
  }, [document.id, hasFile, kind]);

  return (
    <article className={`vault-card ${selected ? "selected" : ""}`}>
      <button type="button" className="card-select" aria-pressed={selected} aria-label={t("vault.selectAria", "Select {{name}}", { name: document.fileName })} onClick={onToggleSelect}>
        <span>{selected ? "✓" : ""}</span>
      </button>

      <button type="button" className="card-thumb-wrap" onClick={hasFile ? onPreview : undefined} aria-label={t("vault.previewAria", "Preview {{name}}", { name: document.fileName })}>
        {kind === "image" && url ? (
          <img src={url} alt="" loading="lazy" className="card-thumb" />
        ) : kind === "pdf" && hasFile ? (
          <PdfThumb document={document} />
        ) : (
          <div className="card-thumb thumb-icon"><FileType2 size={22} /></div>
        )}
        {hasFile && <span className="card-hover-preview">{t("vault.menuPreview", "Preview")}</span>}
      </button>

      <div className="card-body">
        <h3 title={document.fileName}>{document.fileName}</h3>
        <p>{document.documentType} · {formatBytes(document.fileSize)}</p>
        <span className={document.verified ? "card-badge verified" : "card-badge"}>
          {document.verified ? t("common.verified", "✓ Verified") : t("common.pendingBadge", "Pending review")}
        </span>
      </div>

      <div className="card-actions">
        <button type="button" className="card-action primary" onClick={onPreview} disabled={!hasFile}>
          <Eye size={14} /> {t("vault.menuPreview", "Preview")}
        </button>
        <button type="button" className="card-action" onClick={onDownload} disabled={!hasFile}>
          <Download size={14} /> {t("vault.menuDownload", "Download")}
        </button>
        <DocumentMenu document={document} onPreview={onPreview} onDownload={onDownload} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </article>
  );
}