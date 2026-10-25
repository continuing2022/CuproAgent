import { ref } from "vue";
import zh from "@/locales/zh.json";
import en from "@/locales/en.json";

const messages = {
  zh,
  en,
};

const locale = ref(localStorage.getItem("locale") || "zh");

function t(key, fallback = "") {
  return messages[locale.value]?.[key] ?? (fallback || key);
}

function setLocale(val) {
  locale.value = val;
  localStorage.setItem("locale", val);
}

export { t, locale, setLocale };
