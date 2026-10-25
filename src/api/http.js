import axios from "axios";
import {
  clearAuthSession,
  getAccessToken,
  setAuthSession,
} from "@/utils/authStorage";

let isRefreshing = false;
let pendingRequests = [];
const REFRESH_ENDPOINT = "/auth/refresh";

function resolveApiBaseUrl() {
  const configuredBaseUrl = String(
    import.meta.env.VITE_API_BASE_URL || "",
  ).trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  return "http://127.0.0.1:3000";
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function isRefreshRequest(config) {
  return Boolean(config?.url && String(config.url).includes(REFRESH_ENDPOINT));
}

function flushPendingRequests(handler) {
  pendingRequests.forEach(handler);
  pendingRequests = [];
}

function normalizeHttpError(error) {
  const data = error?.response?.data;
  if (data && typeof data === "object") {
    const fieldErrors = data.fieldErrors || data.errors || null;
    return {
      ...data,
      fieldErrors,
      message: data.message || data.error || error?.message || "Network Error",
    };
  }
  return { message: error?.message || "Network Error" };
}

export async function syncSessionAfterRefresh() {
  const { data } = await api.post(REFRESH_ENDPOINT);
  if (!data.accessToken) {
    throw new Error("No access token returned from refresh");
  }

  setAuthSession({
    accessToken: data.accessToken,
  });
  return data;
}

export async function restoreSession() {
  try {
    await syncSessionAfterRefresh();
    return true;
  } catch {
    clearAuthSession();
    return false;
  }
}

api.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (!originalRequest || status !== 401) {
      return Promise.reject(normalizeHttpError(error));
    }
    if (isRefreshRequest(originalRequest)) {
      clearAuthSession();
      return Promise.reject(normalizeHttpError(error));
    }
    if (originalRequest._retry) {
      return Promise.reject(normalizeHttpError(error));
    }
    originalRequest._retry = true;
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }
    isRefreshing = true;
    try {
      const data = await syncSessionAfterRefresh();
      flushPendingRequests(({ resolve }) => resolve(data.accessToken));
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      flushPendingRequests(({ reject }) => reject(refreshError));
      clearAuthSession();
      return Promise.reject(normalizeHttpError(refreshError));
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
