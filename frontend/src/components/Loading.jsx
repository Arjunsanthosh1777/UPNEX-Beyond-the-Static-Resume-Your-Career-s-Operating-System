import { useTranslation } from "react-i18next";
import { SquareAccordion } from "./loading-ui/square-accordion";

// Small inline spinner for buttons/badges (kept from the original ring).
export function Spinner({ className = "" }) {
  return <span className={`spinner ${className}`} aria-hidden="true" />;
}

// Full-screen brand preloader built around the square-accordion spinner:
// the block glyphs pace the UPNEX mark apart while the label flickers.
export function ScreenLoader({ label }) {
  const { t } = useTranslation();
  return (
    <div className="screen-loader" role="status" aria-live="polite">
      <div className="load-brand">
        <SquareAccordion size={7} />
      </div>
      <strong className="load-word">UPNEX</strong>
      <em className="load-text">{label || t("common.loading", "LOADING…")}</em>
    </div>
  );
}