import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "element-plus/es/components/message/style/css";
import "element-plus/es/components/message-box/style/css";
import "./styles/element-plus.scss";
import { setupIdleLogout } from "@/utils/idleLogout";

const app = createApp(App);
app.use(router);
app.mount("#app");

setupIdleLogout(router);
