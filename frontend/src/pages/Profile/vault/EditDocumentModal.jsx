import { useState } from "react";
import { X } from "lucide-react";
import { updateDocument } from "./vaultUtils";
import { useTranslation } from "react-i18next";

const TYPES = ["MARKSHEET", "CERTIFICATE", "RESUME", "OTHER"];

export default function EditDocumentModal({ document, onClose, onSaved, setMessage }) {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState(document.fileName);
  const [documentType, setDocumentType] = useState(document.documentType || "OTHER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event) => {
    event.preventDefault();
    if (!fileName.trim()) {
      setError(t("vault.editNameRequired", "Give the document a name."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateDocument(document.id, { fileName: fileName.trim(), documentType });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t("vault.editFailed", "Couldn't update this document."));
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t("vault.editDocument", "Edit document details")} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal-card" onSubmit={save}>
        <div className="modal-head">
          <h2>{t("vault.editTitle", "Edit details")}</h2>
          <button type="button" className="viewer-icon" onClick={onClose} aria-label={t("common.close", "Close")}><X size={15} /></button>
        </div>
        <label>{t("vault.editName", "Document name")}
          <input value={fileName} maxLength={160} onChange={(event) => setFileName(event.target.value)} placeholder={t("vault.editNamePlaceholder", "e.g. Semester 4 Marksheet")} />
        </label>
        <label>{t("vault.editType", "Type")}
          <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
            {TYPES.map((type) => <option key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</option>)}
          </select>
        </label>
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="app-secondary" onClick={onClose}>{t("common.cancel", "Cancel")}</button>
          <button type="submit" className="app-primary" disabled={saving}>{saving ? t("vault.editSaving", "Saving…") : t("common.saveChanges", "Save changes")}</button>
        </div>
      </form>
    </div>
  );
}