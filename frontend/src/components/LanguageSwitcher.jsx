import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// Compact floating language picker available on every page. The button shows
// the active language in its native script; the menu lists every language pair.
export default function LanguageSwitcher() {
  const { language, setLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active = languages[language] || languages.en;

  return (
    <div className="lang-switcher" ref={ref}>
      <button
        type="button"
        className="lang-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={active.label}
        onClick={() => setOpen((value) => !value)}
      >
        <Globe size={16} />
        <span>{active.native}</span>
      </button>
      {open && (
        <div className="lang-switcher-menu" role="listbox" aria-label="Language">
          {Object.values(languages).map(({ code, label, native }) => (
            <button
              type="button"
              role="option"
              aria-selected={code === language}
              key={code}
              className={code === language ? "active" : ""}
              onClick={() => {
                setLanguage(code);
                setOpen(false);
              }}
            >
              <span className="lang-switcher-name">{native}</span>
              <span className="lang-switcher-label">{label}</span>
              {code === language && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}