import api from "./http";
import { clearAuthSession } from "@/utils/authStorage";

export async function userLogin(payload) {
  const res = await api.post("/auth/login", payload);
  return res.data;
}

export async function userRegister(payload) {
  const res = await api.post("/auth/register", payload);
  return res.data;
}

export async function requestPasswordReset(payload) {
  const res = await api.post("/auth/forgot-password", payload);
  return res.data;
}

export async function userResetPassword(payload) {
  const res = await api.post("/auth/reset-password", payload);
  return res.data;
}

export async function userLogout() {
  try {
    const res = await api.post("/auth/logout");
    return res.data;
  } finally {
    clearAuthSession();
  }
}

export async function getCurrentUser() {
  const res = await api.get("/auth/me");
  return res.data;
}
