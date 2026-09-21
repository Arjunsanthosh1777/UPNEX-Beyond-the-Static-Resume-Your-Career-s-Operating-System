import { useEffect, useState } from "react";
import { FileScan, Loader2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { analyseDocument, getDocumentAccess, saveMarksBatch } from "./vaultUtils";
import { useTranslation } from "react-i18next";

export default function AnalyseModal({ document, onClose, onSaved }) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [stage, setStage] = useState("ready"); // ready | working | confirm | error
  const [rows, setRows] = useState([]);
  const [category, setCategory] = useState("General");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!document.hasFile || document.previewKind !== "image") return;
    let active = true;
    getDocumentAccess(document.id, "preview")
      .then(({ url }) => { if (active) setPreviewUrl(url); })
      .catch(() => {});
    return () => { active = false; };
  }, [document.id, document.hasFile, document.previewKind]);

  const start = async () => {
    setStage("working");
    setError("");
    try {
      const { candidates } = await analyseDocument(document.id);
      if (!candidates.length) {
        setStage("error");
        setError(t("vault.ocrNoMarks", "No marks could be read. Try a clearer, straight-on photo of your marksheet."));
        return;
      }
      setRows(candidates.map((candidate) => ({
        subject: candidate.subject,
        score: String(candidate.score),
        maxScore: String(candidate.maxScore || 100),
        grade: candidate.grade || ""
      })));
      setCategory(candidates[0]?.category || "General");
      setStage("confirm");
    } catch (err) {
      setStage("error");
      setError(err.response?.data?.message || t("vault.ocrFailed", "Couldn't analyse this marksheet."));
    }
  };

  const updateRow = (index, field) => (event) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: event.target.value } : row)));
  };

  const removeRow = (index) => setRows((current) => current.filter((_, i) => i !== index));

  const addRow = () => setRows((current) => [...current, { subject: "", score: "", maxScore: "100", grade: "" }]);

  const save = async () => {
    const payload = [];
    for (const row of rows) {
      const subject = row.subject.trim();
      const score = Number(row.score);
      const maxScore = Number(row.maxScore) || 100;
      if (!subject) continue;
      if (!Number.isFinite(score) || score < 0 || score > maxScore) {
        setError(t("vault.ocrInvalidRow", "Fix \"{{subject}}\" — the score must be a number between 0 and the maximum.", { subject }));
        return;
      }
      payload.push({ subject, category: category.trim() || "General", score, maxScore, grade: row.grade.trim() });
    }
    if (!payload.length) {
      setError(t("vault.ocrEmpty", "Add at least one subject before saving."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveMarksBatch(document.id, payload);
      onSaved(payload.length);
    } catch (err) {
      setError(err.response?.data?.message || t("vault.ocrSaveFailed", "Couldn't save the marks."));
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t("vault.ocrTitle", "Analyse marksheet")} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-card analyse-modal">
        <div className="modal-head">
          <h2>{t("vault.ocrTitle", "Analyse marksheet")}</h2>
          <button type="button" className="viewer-icon" onClick={onClose} aria-label={t("common.close", "Close")}><X size={15} /></button>
        </div>

        <div className="analyse-grid">
          <div className="analyse-preview">
            {previewUrl ? <img src={previewUrl} alt={document.fileName} /> : <div className="thumb-icon"><FileScan size={26} /></div>}
          </div>

          <div className="analyse-stage">
            {stage === "ready" && (
              <>
                <p className="analyse-hint">{t("vault.ocrHint", "UPNEX reads the subjects and marks straight from this marksheet photo — nothing is saved until you confirm every row below.")}</p>
                <p className="analyse-meta">{document.fileName}</p>
                <div className="modal-actions">
                  <button type="button" className="app-secondary" onClick={onClose}>{t("common.cancel", "Cancel")}</button>
                  <button type="button" className="app-primary" onClick={start}>{t("vault.ocrStart", "Start reading")}</button>
                </div>
              </>
            )}

            {stage === "working" && (
              <div className="ocr-busy">
                <Loader2 className="spin" size={22} />
                <strong>{t("vault.ocrReading", "Reading your marksheet…")}</strong>
                <span>{t("vault.ocrFirstRun", "The first analysis downloads the OCR language model, so it can take a minute.")}</span>
              </div>
            )}

            {stage === "error" && (
              <>
                <p className="modal-error">{error}</p>
                <p className="analyse-hint">{t("vault.ocrErrorHint", "Make sure the whole marksheet is in frame, evenly lit, and not rotated.")}</p>
                <div className="modal-actions">
                  <button type="button" className="app-secondary" onClick={onClose}>{t("common.cancel", "Cancel")}</button>
                  <button type="button" className="app-primary" onClick={start}><RefreshCw size={14} /> {t("vault.ocrRetry", "Try again")}</button>
                </div>
              </>
            )}

            {stage === "confirm" && (
              <>
                <div className="analyse-fields">
                  <label>{t("vault.ocrCategory", "Category")}
                    <input value={category} maxLength={40} onChange={(event) => setCategory(event.target.value)} placeholder={t("vault.ocrCategoryPh", "e.g. Semester 3")} />
                  </label>
                </div>
                <div className="analyse-rows">
                  <div className="analyse-row head"><span>{t("vault.ocrSubject", "Subject")}</span><span>{t("vault.ocrScore", "Score")}</span><span>{t("vault.ocrMax", "Max")}</span><span>{t("vault.ocrGrade", "Grade")}</span><span /></div>
                  {rows.map((row, index) => (
                    <div className="analyse-row" key={index}>
                      <input value={row.subject} onChange={updateRow(index, "subject")} maxLength={80} aria-label={t("vault.ocrSubject", "Subject")} />
                      <input value={row.score} onChange={updateRow(index, "score")} inputMode="numeric" aria-label={t("vault.ocrScore", "Score")} />
                      <input value={row.maxScore} onChange={updateRow(index, "maxScore")} inputMode="numeric" aria-label={t("vault.ocrMax", "Max")} />
                      <input value={row.grade} onChange={updateRow(index, "grade")} maxLength={8} aria-label={t("vault.ocrGrade", "Grade")} />
                      <button type="button" className="analyse-remove" onClick={() => removeRow(index)} aria-label={t("vault.ocrRemoveRow", "Remove subject")}><Trash2 size={13} /></button>
                    </div>
                  ))}
                  <button type="button" className="analyse-add" onClick={addRow}><Plus size={13} /> {t("vault.ocrAddRow", "Add subject")}</button>
                </div>
                {error && <p className="modal-error">{error}</p>}
                <div className="modal-actions">
                  <button type="button" className="app-secondary" onClick={onClose}>{t("common.cancel", "Cancel")}</button>
                  <button type="button" className="app-primary" onClick={save} disabled={saving}><FileScan size={14} /> {saving ? t("vault.ocrSaving", "Saving…") : t("vault.ocrSave", "Save to profile")}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}