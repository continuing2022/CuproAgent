import { ElMessage, ElMessageBox } from "element-plus";
import { t } from "@/i18n";
import { userLogout } from "@/api";
const DEFAULT_IDLE_MS = 30 * 60 * 1000;
const DEFAULT_WARN_MS = 30 * 1000;
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

export function setupIdleLogout(router, options = {}) {
  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS;
  const warnMs = options.warnMs ?? DEFAULT_WARN_MS;
  const channel = new BroadcastChannel("activity_channel");

  let idleTimer = null;
  let autoLogoutTimer = null;
  let warningVisible = false;
  let loggingOut = false;

  const broadcastActivity = () => {
    channel.postMessage({ type: "activity", at: Date.now() });
  };

  const clearTimers = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (autoLogoutTimer) {
      clearTimeout(autoLogoutTimer);
      autoLogoutTimer = null;
    }
  };
  // 只有在有 token 且不在 Login 页时才跟踪用户活动
  const shouldTrack = () => {
    const token = localStorage.getItem("accessToken");
    const currentRoute = router.currentRoute.value;
    return Boolean(token) && currentRoute?.name !== "Login";
  };

  const logout = async () => {
    if (loggingOut) return;
    loggingOut = true;

    clearTimers();
    warningVisible = false;
    ElMessageBox.close();
    await userLogout();
    ElMessage.warning(t("idle_auto_logout"));
    if (router.currentRoute.value?.name !== "Login") {
      router.push({ name: "Login" });
    }

    // 允许后续重新登录后继续使用该逻辑
    setTimeout(() => {
      loggingOut = false;
    }, 0);
  };

  // 重置 idle 定时器，显示警告框后如果用户继续操作则取消自动登出
  const resetIdleTimer = () => {
    if (!shouldTrack()) {
      clearTimers();
      return;
    }
    if (warningVisible) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
      if (!shouldTrack() || warningVisible) return;
      warningVisible = true;
      autoLogoutTimer = setTimeout(() => {
        logout();
      }, warnMs);
      try {
        const seconds = Math.floor(warnMs / 1000);
        const warningMessage = t("idle_warning_message").replace(
          "{seconds}",
          String(seconds),
        );
        await ElMessageBox.confirm(warningMessage, t("idle_warning_title"), {
          confirmButtonText: t("idle_continue"),
          cancelButtonText: t("logout"),
          type: "warning",
          closeOnClickModal: false,
          closeOnPressEscape: false,
        });
        warningVisible = false;
        if (autoLogoutTimer) {
          clearTimeout(autoLogoutTimer);
          autoLogoutTimer = null;
        }
        resetIdleTimer();
      } catch {
        logout();
      }
    }, idleMs);
  };

  const handleActivity = () => {
    // 弹窗出现后，必须显式点“继续会话”或“退出登录”，活动事件不再自动续期
    if (warningVisible) return;
    resetIdleTimer();
  };

  const onLocalActivity = () => {
    broadcastActivity();
    handleActivity();
  };

  channel.onmessage = (event) => {
    if (event.data.type === "activity") {
      handleActivity();
    }
  };
  ACTIVITY_EVENTS.forEach((event) => {
    window.addEventListener(event, onLocalActivity, { passive: true });
  });
  // 路由切换
  router.afterEach(() => {
    resetIdleTimer();
  });

  resetIdleTimer();

  return () => {
    clearTimers();
    channel.onmessage = null;
    channel.close();
    ACTIVITY_EVENTS.forEach((event) => {
      window.removeEventListener(event, onLocalActivity);
    });
  };
}
