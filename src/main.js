import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import { ElMessage } from "element-plus";

const app = createApp(App);
app.use(router);
app.use(ElementPlus);
app.mount("#app");

// 全局 token 监听：检测其它标签页的 localStorage 变化以及同页面的 token 被清除
let _prevToken = localStorage.getItem("token");
window.addEventListener("storage", (e) => {
  if (e.key === "token") {
    const newToken = e.newValue;
    if (!newToken) {
      ElMessage.error("token失效，请重新登录");
      router.push({ name: "Login" });
    }
  }
});

// 同标签页修改 localStorage 时 storage 不会触发，使用轮询检查变化
setInterval(() => {
  const current = localStorage.getItem("token");
  if (_prevToken && !current) {
    ElMessage.error("token失效，请重新登录");
    router.push({ name: "Login" });
  }
  _prevToken = current;
}, 3000);
