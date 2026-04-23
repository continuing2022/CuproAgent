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
  const channel =
    typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("activity_channel")
      : null;

  let idleTimer = null;
  let autoLogoutTimer = null;
  let warningVisible = false;
  let loggingOut = false;

  const broadcastActivity = () => {
    channel?.postMessage({ type: "activity", at: Date.now() });
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

    try {
      await userLogout();
    } catch (error) {
      // Keep logout resilient even if the network request fails.
    } finally {
      ElMessage.warning(t("idle_auto_logout"));
      if (router.currentRoute.value?.name !== "Login") {
        router.push({ name: "Login" });
      }
      loggingOut = false;
    }
  };

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
    if (warningVisible) return;
    resetIdleTimer();
  };

  const onLocalActivity = () => {
    broadcastActivity();
    handleActivity();
  };

  if (channel) {
    channel.onmessage = (event) => {
      if (event?.data?.type === "activity") {
        handleActivity();
      }
    };
  }

  ACTIVITY_EVENTS.forEach((event) => {
    window.addEventListener(event, onLocalActivity, { passive: true });
  });

  const removeAfterEach = router.afterEach(() => {
    resetIdleTimer();
  });

  resetIdleTimer();

  return () => {
    clearTimers();
    if (channel) {
      channel.onmessage = null;
      channel.close();
    }
    if (typeof removeAfterEach === "function") {
      removeAfterEach();
    }
    ACTIVITY_EVENTS.forEach((event) => {
      window.removeEventListener(event, onLocalActivity);
    });
  };
}
