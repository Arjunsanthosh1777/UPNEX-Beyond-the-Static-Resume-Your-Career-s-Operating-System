import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getPdfjs } from "./pdfjsLoader";
import { useTranslation } from "react-i18next";

// Renders a PDF into the stage canvas with page navigation, fit-width /
// fit-page and zoom. Uses the browser's own Range streaming via the signed
// URL so pages load progressively instead of downloading the whole file.
const PdfViewer = forwardRef(function PdfViewer({ url, page, onReady }, ref) {
  const { t } = useTranslation();
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const fitRef = useRef({ fitPage: 1, baseWidth: 612 });
  const [scale, setScale] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState("loading"); // loading | error | ready

  const fitWidthRatio = () => {
    const stage = stageRef.current;
    if (!stage) return 1;
    return (stage.clientWidth - 24) / fitRef.current.baseWidth / fitRef.current.fitPage;
  };

  const renderPage = useCallback(async (pageNumber, desiredZoom) => {
    const pdfDoc = pdfDocRef.current;
    const stage = stageRef.current;
    if (!pdfDoc || !stage) return;
    const pdfPage = await pdfDoc.getPage(pageNumber);
    const base = pdfPage.getViewport({ scale: 1 });
    const fitPage = Math.min(
      (stage.clientWidth - 24) / base.width,
      (stage.clientHeight - 24) / base.height
    );
    fitRef.current = { fitPage, baseWidth: base.width };
    const viewport = pdfPage.getViewport({ scale: Math.max(0.2, fitPage * desiredZoom) });
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    await pdfPage.render({
      canvasContext: canvas.getContext("2d"),
      viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
    }).promise;
    pdfPage.cleanup();
    setScale(Math.round(fitPage * desiredZoom * 100));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let currentTask;
    setStatus("loading");
    (async () => {
      try {
        const pdfjs = await getPdfjs();
        if (cancelled) return;
        currentTask = pdfjs.getDocument({ url });
        const pdfDoc = await currentTask.promise;
        if (cancelled) {
          pdfDoc.destroy();
          return;
        }
        pdfDocRef.current = pdfDoc;
        onReady?.(pdfDoc.numPages);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      if (currentTask) {
        Promise.resolve(currentTask.destroy?.()).catch(() => {});
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy?.();
        pdfDocRef.current = null;
      }
    };
  }, [url, onReady]);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    renderPage(page, zoom).catch(() => {
      if (!cancelled) setStatus("error");
    });
    return () => { cancelled = true; };
  }, [status, page, zoom, renderPage]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || status !== "ready") return;
    const observer = new ResizeObserver(() => renderPage(page, zoom).catch(() => {}));
    observer.observe(stage);
    return () => observer.disconnect();
  }, [status, page, zoom, renderPage]);

  useImperativeHandle(ref, () => ({
    printCurrentPage() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const popup = window.open("", "_blank");
      if (!popup) return;
      popup.document.write(`<!doctype html><html><head><title>UPNEX document</title><style>html,body{margin:0;display:grid;place-items:start}</style></head><body><img id="p" style="max-width:100%" alt="document page"/></body></html>`);
      popup.document.close();
      const image = popup.document.getElementById("p");
      image.onload = () => popup.print();
      image.src = canvas.toDataURL("image/png");
    }
  }));

  if (status === "error") {
    return (
      <div className="viewer-error" role="alert">
        <strong>{t("vault.viewerLoadError", "Document preview unavailable")}</strong>
        <span>{t("vault.viewerLoadErrorSub", "We could not display this document here.")}</span>
      </div>
    );
  }

  return (
    <div className="pdf-stage" ref={stageRef}>
      {status === "loading" && <div className="viewer-loading" role="status">{t("vault.loadingDoc", "Loading document…")}</div>}
      <canvas ref={canvasRef} className="pdf-canvas" hidden={status !== "ready"} />
      <div className="stage-tools">
        <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label={t("vault.zoomOut", "Zoom out")}>−</button>
        <span aria-live="polite">{scale ? `${scale}%` : "—"}</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label={t("vault.zoomIn", "Zoom in")}>+</button>
        <button type="button" onClick={() => setZoom(1)} title={t("vault.fitToPage", "Fit to page")} aria-label={t("vault.fitToPage", "Fit to page")}>{t("vault.fitPage", "Fit Page")}</button>
        <button type="button" onClick={() => setZoom(fitWidthRatio())} title={t("vault.fitToWidth", "Fit to width")} aria-label={t("vault.fitToWidth", "Fit to width")}>Fit Width</button>
      </div>
    </div>
  );
});

export default PdfViewer;