import axios from "axios";
import {
  clearAuthSession,
  getAccessToken,
  getSessionRevision,
  setAuthSession,
} from "@/utils/authStorage";

let refreshPromise = null;
let authOperationTail = Promise.resolve();
const REFRESH_ENDPOINT = "/auth/refresh";
const PUBLIC_AUTH_PATHS = new Set([
  "/auth/login", "/auth/register", "/auth/forgot-password",
  "/auth/reset-password", "/auth/logout", REFRESH_ENDPOINT,
]);

function resolveApiBaseUrl() {
  const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return "http://127.0.0.1:3000";
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export function withAuthLock(work) {
  const locks = globalThis.navigator?.locks;
  // Serialize refresh/login/logout across same-origin tabs. Tokens stay in
  // memory/HttpOnly cookies and are never broadcast or stored locally.
  const operation = authOperationTail.then(() => locks?.request
    ? locks.request(`cupro-auth:${api.defaults.baseURL}`, work)
    : work());
  authOperationTail = operation.catch(() => {});
  return operation;
}

function normalizeHttpError(error) {
  const data = error?.response?.data;
  if (data && typeof data === "object") {
    return {
      ...data,
      status: error.response.status,
      fieldErrors: data.fieldErrors || data.errors || null,
      message: data.message || data.error || error?.message || "Network Error",
    };
  }
  return {
    status: error?.response?.status,
    code: error?.code,
    message: error?.message || "Network Error",
  };
}

export function syncSessionAfterRefresh({ failedAccessToken } = {}) {
  const newerToken = () => failedAccessToken !== undefined && getAccessToken() && getAccessToken() !== failedAccessToken;
  if (newerToken()) return Promise.resolve({ accessToken: getAccessToken() });
  if (refreshPromise) return refreshPromise;
  const revision = getSessionRevision();
  const ensureCurrentSession = () => {
    if (revision !== getSessionRevision()) {
      throw Object.assign(new Error("Session changed during refresh"), { code: "session_changed" });
    }
  };
  refreshPromise = withAuthLock(async () => {
    ensureCurrentSession();
    if (newerToken()) return { accessToken: getAccessToken() };
    let data;
    // A competing tab without Web Locks may already have rotated the cookie.
    // Retry only explicit conflicts, using the browser's latest HttpOnly cookie.
    for (let attempt = 0; ; attempt++) {
      try {
        ({ data } = await api.post(REFRESH_ENDPOINT));
        break;
      } catch (error) {
        if (error.status !== 409 || error.code !== "refresh_conflict" || attempt >= 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
        ensureCurrentSession();
      }
    }
    ensureCurrentSession();
    if (!data.accessToken) throw new Error("No access token returned from refresh");
    setAuthSession({ accessToken: data.accessToken });
    return data;
  }).catch(error => {
    if (error.status === 401 && revision === getSessionRevision()) clearAuthSession();
    throw error;
  }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function restoreSession() {
  try {
    await syncSessionAfterRefresh();
    return true;
  } catch {
    return false;
  }
}

api.interceptors.request.use(config => {
  const accessToken = getAccessToken();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(response => response, async error => {
  const originalRequest = error.config;
  if (!originalRequest || error.response?.status !== 401) throw normalizeHttpError(error);
  const path = new URL(originalRequest.url, api.defaults.baseURL + "/").pathname;
  if (PUBLIC_AUTH_PATHS.has(path)) throw normalizeHttpError(error);
  const failedAccessToken = (originalRequest.headers?.Authorization || "").replace(/^Bearer\s+/i, "");
  if (originalRequest._retry) {
    if (getAccessToken() === failedAccessToken) clearAuthSession();
    throw normalizeHttpError(error);
  }
  originalRequest._retry = true;
  const data = await syncSessionAfterRefresh({ failedAccessToken });
  originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
  return api(originalRequest);
});

export default api;
