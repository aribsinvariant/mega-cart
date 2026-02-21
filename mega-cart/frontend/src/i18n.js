import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
//import zh from "./locales/zh.json";

const saved = localStorage.getItem("lang");

export const i18n = createI18n({
  legacy: false,
  locale: saved || "en",
  fallbackLocale: "en",
  messages: { en}
});