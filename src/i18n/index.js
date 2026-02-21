import { ref } from "vue";
import zh from "@/locales/zh.json";
import en from "@/locales/en.json";

const messages = {
  zh,
  en,
};

const locale = ref(localStorage.getItem("locale") || "zh");

function t(path, fallback = "") {
  const segs = path.split(".");
  const msgObj = messages[locale.value] || {};
  let cur = msgObj;
  for (const s of segs) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, s)) {
      cur = cur[s];
    } else {
      return fallback || path;
    }
  }
  return typeof cur === "string" ? cur : fallback || path;
}

function setLocale(val) {
  locale.value = val;
  localStorage.setItem("locale", val);
  window.dispatchEvent(
    new CustomEvent("locale-changed", { detail: { locale: val } }),
  );
}

export default {
  install(app) {
    app.config.globalProperties.$t = t;
    app.provide("i18nLocale", locale);
    app.provide("i18nSetLocale", setLocale);
  },
};

export { t, locale, setLocale };
