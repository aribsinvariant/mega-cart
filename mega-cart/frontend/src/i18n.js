import { createI18n } from "vue-i18n";
import en from "./locales/en.json";

const saved = localStorage.getItem("lang");

export const i18n = createI18n({
  legacy: false,
  locale: saved || "en",
  fallbackLocale: "en",
  messages: { en}
});