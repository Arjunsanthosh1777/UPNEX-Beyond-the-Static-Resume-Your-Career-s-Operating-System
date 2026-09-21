import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { useAuth } from "./AuthContext";
import { LANGS, LANGUAGE_CODES, loadLanguage } from "../i18n";

const STORAGE_KEY = "upnex_locale";
const SUGGEST_KEY = "upnex_locale_suggested";

const LanguageContext = createContext(null);

function browserLanguageCode() {
  if (typeof navigator === "undefined") return null;
  const raw = navigator.language || navigator.languages?.[0] || "";
  const base = String(raw).toLowerCase().split("-")[0];
  return LANGUAGE_CODES.includes(base) ? base : null;
}

export function LanguageProvider({ children }) {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [language, setLanguageState] = useState("en");
  const [suggested, setSuggested] = useState(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [pending, setPending] = useState(false);

  const serverLanguage = !user?.guest && LANGUAGE_CODES.includes(user?.preferredLanguage)
    ? user.preferredLanguage
    : null;

  const apply = useCallback(async (code) => {
    setPending(true);
    try {
      const active = await loadLanguage(code);
      setLanguageState(active);
      localStorage.setItem(STORAGE_KEY, active);
      if (user && !user.guest) {
        // Persist to the account so the preference follows across devices.
        // Best effort: never surface an error for a cosmetic preference.
        api.patch("/profile/preferences", { preferredLanguage: active }).catch(() => {});
      }
    } finally {
      setPending(false);
    }
  }, [user?.guest]);

  // Initial language: server preference wins, then localStorage, then a first-
  // run browser-language suggestion. The suggestion never auto-applies.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (serverLanguage && stored !== serverLanguage) {
      apply(serverLanguage);
      return;
    }
    if (stored && LANGUAGE_CODES.includes(stored)) {
      loadLanguage(stored).then(setLanguageState);
      return;
    }
    if (localStorage.getItem(SUGGEST_KEY)) return;
    const detected = browserLanguageCode();
    if (detected && detected !== "en") {
      setSuggested(detected);
      setShowSuggestion(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverLanguage]);

  async function setLanguage(code) {
    const target = LANGS[code] ? code : "en";
    localStorage.setItem(SUGGEST_KEY, "1");
    setShowSuggestion(false);
    await apply(target);
  }

  function keepEnglish() {
    localStorage.setItem(SUGGEST_KEY, "1");
    setShowSuggestion(false);
    if (localStorage.getItem(STORAGE_KEY) === null) {
      localStorage.setItem(STORAGE_KEY, "en");
      apply("en");
    }
  }

  const value = {
    language,
    pending,
    setLanguage,
    languages: LANGS,
    suggested,
    showSuggestion,
    keepEnglish
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
      {showSuggestion && suggested && !authLoading && (
        <div className="lang-suggestion" role="dialog" aria-live="polite">
          <strong>{t("settings.detectedTitle", "Welcome to UPNEX")}</strong>
          <p>
            {t("settings.detectedBody", "We detected {{language}} as your preferred language.", {
              language: LANGS[suggested].label
            })}
          </p>
          <div className="lang-suggestion-actions">
            <button type="button" onClick={() => setLanguage(suggested)}>
              {t("settings.useRecommended", "Use {{language}}", { language: LANGS[suggested].label })}
            </button>
            <button type="button" className="ghost" onClick={keepEnglish}>
              {t("settings.continueEnglish", "Continue in English")}
            </button>
          </div>
        </div>
      )}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);