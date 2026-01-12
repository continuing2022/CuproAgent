import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("../views/Home..vue"),
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
  },
  {
    path: "/History",
    name: "History",
    component: () => import("../views/History.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
