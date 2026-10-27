import { createRouter, createWebHistory } from "vue-router";
import { getCurrentUser, restoreSession } from "@/api";
import { clearAuthSession, hasAccessToken } from "@/utils/authStorage";
import { finishRouteLoading, startRouteLoading } from "@/utils/routeLoading";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("../views/Home.vue"),
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
  },
  {
    path: "/usermanagement",
    name: "Usermanagement",
    component: () => import("../views/Usermanagement.vue"),
    meta: {
      requiresAdmin: true,
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

let activeRouteLoadingId = null;

router.beforeEach(async (to, from) => {
  if (activeRouteLoadingId) {
    finishRouteLoading(activeRouteLoadingId);
  }
  activeRouteLoadingId = startRouteLoading();

  const hasResetToken = hash => new URLSearchParams(hash.slice(1)).has("reset-token");
  if (to.name === "Login" && (hasResetToken(to.hash) || (from.name === "Login" && hasResetToken(from.hash) && !to.hash))) {
    return true;
  }

  let authenticated = hasAccessToken();
  if (!authenticated) {
    authenticated = await restoreSession();
  }

  if (!authenticated && to.name !== "Login") {
    return { name: "Login" };
  }

  if (authenticated && to.name === "Login") {
    return { name: "Home" };
  }

  if (authenticated && to.meta?.requiresAdmin) {
    try {
      const user = await getCurrentUser();
      if (user?.role !== "admin") {
        return { name: "Home" };
      }
    } catch {
      clearAuthSession();
      return { name: "Login" };
    }
  }

  return true;
});

function finishNavigation() {
  if (!activeRouteLoadingId) return;
  finishRouteLoading(activeRouteLoadingId);
  activeRouteLoadingId = null;
}

router.afterEach(finishNavigation);
router.onError(finishNavigation);

export default router;
