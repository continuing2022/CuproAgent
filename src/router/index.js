import { createRouter, createWebHistory } from "vue-router";

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
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局路由守卫：无 token 跳转到 Login，有 token 访问 Login 则重定向到 Home
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");
  if (!token && to.name !== "Login") {
    return next({ name: "Login" });
  }
  if (token && to.name === "Login") {
    return next({ name: "Home" });
  }
  next();
});

export default router;
