import { createRouter, createWebHistory } from "vue-router";
import { getCurrentUser, restoreSession } from "@/api";
import { clearAuthSession, hasAccessToken } from "@/utils/authStorage";
import {
  finishRouteLoading,
  startRouteLoading,
} from "@/utils/routeLoading";

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

router.beforeEach(async (to) => {
  if (activeRouteLoadingId) {
    finishRouteLoading(activeRouteLoadingId);
  }
  activeRouteLoadingId = startRouteLoading();

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
    } catch (error) {
      clearAuthSession();
      return { name: "Login" };
    }
  }

  return true;
});

router.afterEach(() => {
  if (!activeRouteLoadingId) return;
  finishRouteLoading(activeRouteLoadingId);
  activeRouteLoadingId = null;
});

router.onError(() => {
  if (!activeRouteLoadingId) return;
  finishRouteLoading(activeRouteLoadingId);
  activeRouteLoadingId = null;
});

export default router;
