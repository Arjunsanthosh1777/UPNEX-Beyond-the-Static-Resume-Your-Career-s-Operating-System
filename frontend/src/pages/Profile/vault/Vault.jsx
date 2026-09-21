import { useMemo, useState } from "react";
import { Archive, CheckCircle2, PackageOpen, Search, ShieldCheck, Upload, X } from "lucide-react";
import DocumentCard from "./DocumentCard";
import DocumentViewer from "./DocumentViewer";
import EditDocumentModal from "./EditDocumentModal";
import { Toasts, useToasts } from "./Toasts";
import { deleteDocument, downloadDocument, downloadSelectedAsZip } from "./vaultUtils";
import { useTranslation } from "react-i18next";

export default function Vault({ profile, uploadDocument, loadProfile }) {
  const documents = profile.documents || [];
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [viewerDoc, setViewerDoc] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [busing, setBusing] = useState(false);
  const { toasts, push, dismiss } = useToasts();
  const { t } = useTranslation();

  const selectMode = selected.size > 0;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter((doc) =>
      `${doc.fileName} ${doc.documentType} ${doc.originalName || ""}`.toLowerCase().includes(query)
    );
  }, [documents, search]);

  const toggleSelect = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((current) => {
      if (current.size > 0) return new Set();
      return new Set(filtered.map((doc) => doc.id));
    });
  };

  const handleDownload = (document) => {
    downloadDocument(document).then(() => push(t("vault.downloadStarted", "Download started"), "success")).catch(() => push(t("vault.downloadFailed", "Couldn't download this document."), "error"));
  };

  const handleSelectedZip = async () => {
    const docs = documents.filter((doc) => selected.has(doc.id));
    setBusing(true);
    try {
      const skipped = await downloadSelectedAsZip(docs);
      push(t("vault.downloadStarted", "Download started"), "success");
      if (skipped) push(t("vault.zipSkipped", "... document(s) skipped — access no longer available.", { count: skipped }), "error");
    } catch (error) {
      push(error.message || t("vault.zipFailed", "Couldn't package the selected documents."), "error");
    } finally {
      setBusing(false);
    }
  };

  const handleDelete = async (document) => {
    if (!window.confirm(t("vault.deleteConfirm", "Delete \"{{name}}\" from your vault? This cannot be undone.", { name: document.fileName }))) return;
    try {
      await deleteDocument(document.id);
      setViewerDoc(null);
      setSelected((current) => { const next = new Set(current); next.delete(document.id); return next; });
      await loadProfile();
      push(t("vault.deleted", "Document deleted."), "success");
    } catch {
      push(t("vault.deleteFailed", "Couldn't delete this document."), "error");
    }
  };

  return (
    <>
      <div className="feature-grid feature-vault">
        <section className="app-panel feature-main-panel">
          <div className="vault-toolbar">
            <div className="vault-search">
              <Search size={15} />
              <input placeholder={t("vault.searchPlaceholder", "Search documents…")} value={search} onChange={(event) => setSearch(event.target.value)} aria-label={t("vault.searchDocuments", "Search documents")} />
              {search && <button type="button" className="vault-search-clear" onClick={() => setSearch("")} aria-label={t("vault.clearSearch", "Clear search")}><X size={13} /></button>}
            </div>
            <span className="vault-count">{t("vault.documents", { count: filtered.length })}</span>
          </div>

          <label className="upload-zone feature-upload">
            <Upload size={24} />
            <strong>{t("vault.dropHint", "Drop a marksheet or certificate here")}</strong>
            <span>{t("vault.pdfHint", "PDF, image or document · max 10 MB")}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md" onChange={uploadDocument} />
          </label>

          {selectMode && (
            <div className="vault-bulk-bar">
              <span><b>{selected.size}</b> {t("vault.bulkSelected", "selected · ZIP packages in your browser")}</span>
              <button type="button" className="app-primary" onClick={handleSelectedZip} disabled={busing}>
                <Archive size={14} /> {busing ? t("vault.packaging", "Packaging…") : t("vault.downloadN", { count: selected.size })}
              </button>
              <button type="button" className="viewer-icon" onClick={() => setSelected(new Set())} aria-label={t("vault.clearSelection", "Clear selection")}><X size={15} /></button>
            </div>
          )}

          {filtered.length ? (
            <>
              <div className="vault-cards">
                {filtered.map((document) => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    selected={selected.has(document.id)}
                    onToggleSelect={() => toggleSelect(document.id)}
                    onPreview={() => document.hasFile && setViewerDoc(document)}
                    onDownload={() => handleDownload(document)}
                    onEdit={() => setEditDoc(document)}
                    onDelete={() => handleDelete(document)}
                  />
                ))}
              </div>
              <button type="button" className="vault-select-all" onClick={toggleAll}>
                <CheckCircle2 size={15} /> {selected.size > 0 ? t("vault.clearAll", "Clear all") : t("vault.selectAll", "Select all")}
              </button>
            </>
          ) : (
            <div className="empty-state"><PackageOpen size={17} />
              {search ? t("vault.noMatch", "No documents match your search.") : t("vault.emptyTitle", "Your documents will appear here after upload.")}
            </div>
          )}
        </section>

        <section className="app-panel feature-side-panel">
          <div className="vault-orbit"><ShieldCheck size={30} /></div>
          <h3>{t("vault.privateByDefault", "Private by default.")}</h3>
          <p>{t("vault.emptySub", "Previews and downloads are served through short-lived, signed links only to you.")} Public portfolios show metadata — never the original file.</p>
          <div className="feature-stat"><strong>{documents.length}</strong><span>{t("vault.countInVault", "documents in your vault")}</span></div>
          <div className="feature-stat secondary"><strong>{documents.filter((doc) => doc.verified).length}</strong><span>{t("vault.verified", "verified")}</span></div>
        </section>
      </div>

      {viewerDoc && (
        <DocumentViewer
          document={viewerDoc}
          onClose={() => setViewerDoc(null)}
          onDownloaded={() => { push(t("vault.downloadStarted", "Download started"), "success"); }}
          onEdit={() => { setEditDoc(viewerDoc); setViewerDoc(null); }}
          onDelete={() => handleDelete(viewerDoc)}
        />
      )}
      {editDoc && (
        <EditDocumentModal
          document={editDoc}
          onClose={() => setEditDoc(null)}
          onSaved={() => {
            setEditDoc(null);
            loadProfile().then(() => push(t("vault.detailsSaved", "Document details saved."), "success"));
          }}
        />
      )}
      <Toasts toasts={toasts} dismiss={dismiss} />
    </>
  );
}