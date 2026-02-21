import { createI18n } from "vue-i18n";
// import ar from "./locales/ar.json";
import en from "./locales/en.json";
// import es from "./locales/es.json";
// import fr from "./locales/fr.json";
// import hi from "./locales/hi.json";
import zh from "./locales/zh.json";

const saved = localStorage.getItem("lang");

export const i18n = createI18n({
  legacy: false,
  locale: saved || "zh",
  fallbackLocale: "en",
  messages: {en, zh}//{ar, en, es, fr, hi, zh}
});