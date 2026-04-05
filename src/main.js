import { createApp } from "vue";
import { ElMessage } from "element-plus";
import App from "./App.vue";
import router from "./router";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "./styles/element-overrides.css";
import i18n, { t } from "@/i18n";
import { setupIdleLogout } from "@/utils/idleLogout";
import { clearAuthSession, hasAccessToken } from "@/utils/authStorage";

const app = createApp(App);
app.use(router);
app.use(ElementPlus);
app.use(i18n);
app.mount("#app");

setupIdleLogout(router, { idleMs: 30 * 60 * 1000 });

let previousTokenState = hasAccessToken();

window.addEventListener("storage", (event) => {
  if (event.key !== "accessToken") return;
  const nextTokenState = Boolean(event.newValue);
  if (previousTokenState && !nextTokenState) {
    clearAuthSession();
    ElMessage.error(t("token_invalid"));
    router.push({ name: "Login" });
  }
  previousTokenState = nextTokenState;
});
