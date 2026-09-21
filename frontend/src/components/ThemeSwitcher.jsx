import { useEffect, useRef, useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

// Compact theme picker that sits next to the language switcher in the app
// header. Persists via localStorage and falls back to the OS preference on
// first visit. Icon says Sun in light mode, Moon in dark mode.
export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
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

  const options = [
    { key: "light", label: "Theme light", native: "Light", Icon: Sun },
    { key: "dark", label: "Theme dark", native: "Dark", Icon: Moon }
  ];

  return (
    <div className="theme-switcher" ref={ref}>
      <button
        type="button"
        className="theme-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={theme === "light" ? "Light theme" : "Dark theme"}
        onClick={() => setOpen((value) => !value)}
      >
        {theme === "light" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      {open && (
        <div className="theme-switcher-menu" role="listbox" aria-label="Theme">
          {options.map(({ key, label, native, Icon }) => (
            <button
              type="button"
              role="option"
              aria-selected={key === theme}
              key={key}
              className={key === theme ? "active" : ""}
              onClick={() => {
                setTheme(key);
                setOpen(false);
              }}
            >
              <Icon size={16} />
              <span className="theme-switcher-name">{native}</span>
              <span className="theme-switcher-label">{label}</span>
              {key === theme && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}