import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";

// Static registry of supported languages. English is bundled at build time so
// the fallback is always available offline; every other locale is fetched once
// via a dynamic import the first time it is selected and cached afterwards.
export const LANGS = {
  en: { code: "en", label: "English", native: "English", dir: "ltr" },
  hi: { code: "hi", label: "Hindi", native: "हिन्दी", dir: "ltr" },
  ml: { code: "ml", label: "Malayalam", native: "മലയാളം", dir: "ltr" },
  ta: { code: "ta", label: "Tamil", native: "தமிழ்", dir: "ltr" },
  te: { code: "te", label: "Telugu", native: "తెలుగు", dir: "ltr" },
  kn: { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", dir: "ltr" },
  bn: { code: "bn", label: "Bengali", native: "বাংলা", dir: "ltr" },
  mr: { code: "mr", label: "Marathi", native: "मराठी", dir: "ltr" },
  gu: { code: "gu", label: "Gujarati", native: "ગુજરાતી", dir: "ltr" },
  pa: { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", dir: "ltr" },
  or: { code: "or", label: "Odia", native: "ଓଡ଼ିଆ", dir: "ltr" },
  as: { code: "as", label: "Assamese", native: "অসমীয়া", dir: "ltr" }
};

export const LANGUAGE_CODES = Object.keys(LANGS);

const resources = {
  en: { translation: en }
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  defaultNS: "translation",
  ns: ["translation"],
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  react: { useSuspense: false }
});

function applyDirection(code) {
  const dir = LANGS[code]?.dir || "ltr";
  if (typeof document !== "undefined") {
    document.documentElement.lang = code;
    document.documentElement.dir = dir;
  }
}

// Keyed dynamic imports so only the selected locale is ever fetched. Explicit
// statements let Vite statically emit one chunk per language. A failed load is
// swallowed: i18next keeps serving the English fallback so the UI can never
// show a bare key.
const loaders = {
  hi: () => import("../locales/hi.json"),
  ml: () => import("../locales/ml.json"),
  ta: () => import("../locales/ta.json"),
  te: () => import("../locales/te.json"),
  kn: () => import("../locales/kn.json"),
  bn: () => import("../locales/bn.json"),
  mr: () => import("../locales/mr.json"),
  gu: () => import("../locales/gu.json"),
  pa: () => import("../locales/pa.json"),
  or: () => import("../locales/or.json"),
  as: () => import("../locales/as.json")
};

export async function loadLanguage(code) {
  const target = LANGS[code] ? code : "en";
  if (target !== "en" && !i18n.hasResourceBundle(target, "translation")) {
    const loader = loaders[target];
    if (loader) {
      try {
        const module = await loader();
        const bundle = module.default || module;
        if (bundle && typeof bundle === "object") {
          i18n.addResourceBundle(target, "translation", bundle, true, true);
        }
      } catch {
        // Keep the fallback in place.
      }
    }
  }
  await i18n.changeLanguage(target);
  applyDirection(target);
  return target;
}

// Keep the document language in sync even when a resource file is missing
// entirely (first paint before any locale is loaded).
applyDirection(i18n.language);

export default i18n;