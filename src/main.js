import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "element-plus/es/components/message/style/css";
import "element-plus/es/components/message-box/style/css";
import "./styles/element-overrides.css";
import i18n from "@/i18n";
import { setupIdleLogout } from "@/utils/idleLogout";

const app = createApp(App);
app.use(router);
app.use(i18n);
app.mount("#app");

setupIdleLogout(router);
