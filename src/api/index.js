import axios from "axios";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAuthSession,
} from "@/utils/authStorage";

let isRefreshing = false;
let pendingRequests = [];

const api = axios.create({
  baseURL: "http://127.0.0.1:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token) => {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const data = await refreshToken();
        if (!data.accessToken) {
          throw new Error("No access token returned from refresh");
        }

        setAuthSession({ accessToken: data.accessToken });
        pendingRequests.forEach(({ resolve }) => resolve(data.accessToken));
        pendingRequests = [];

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        pendingRequests.forEach(({ reject }) => reject(refreshError));
        pendingRequests = [];
        clearAuthSession();
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(
      error.response?.data || { message: error.message || "Network Error" },
    );
  },
);

export async function userLogin(payload) {
  const res = await api.post("/auth/login", payload);
  return res.data;
}

export async function userRegister(payload) {
  const res = await api.post("/auth/register", payload);
  return res.data;
}

export async function userLogout() {
  const refreshToken = getRefreshToken();
  clearAuthSession();
  const res = await api.post("/auth/logout", { refreshToken });
  return res.data;
}

export async function refreshToken() {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) throw new Error("No refresh token available");
  const res = await api.post("/auth/refresh", { refreshToken: refreshTokenValue });
  return res.data;
}

export async function getUsers(params = {}) {
  const res = await api.get("/auth/users", { params });
  return res.data;
}

export async function getUsersStats() {
  const res = await api.get("/auth/users/stats");
  return res.data;
}

export async function getUserById(id) {
  const res = await api.get(`/auth/users/${id}`);
  return res.data;
}

export async function createUser(payload) {
  const res = await api.post("/auth/users", payload);
  return res.data;
}

export async function updateUser(id, payload) {
  const res = await api.put(`/auth/users/${id}`, payload);
  return res.data;
}

export async function deleteUser(id) {
  const res = await api.delete(`/auth/users/${id}`);
  return res.data;
}

export async function bulkDeleteUsers(userIds) {
  const res = await api.post("/auth/users/bulk-delete", { userIds });
  return res.data;
}

export async function exportUsers(payload) {
  const res = await api.post("/auth/users/export", payload || {});
  return res.data;
}

export async function getCurrentUser() {
  const res = await api.get("/auth/me");
  return res.data;
}

export async function getConversations(params = {}) {
  const res = await api.get("/conversations", { params });
  return res.data;
}

export async function getMessages(convId) {
  const res = await api.get(`/conversations/${convId}/messages`);
  return res.data;
}

export async function deleteConversation(convId) {
  const res = await api.delete(`/conversations/${convId}`);
  return res.data;
}

export function sendMessageStream(
  payload,
  { onStarted, onRetrieved, onChunk, onDone, onError, onAbort } = {},
) {
  const controller = new AbortController();

  (async () => {
    try {
      const headers = {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      };

      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${api.defaults.baseURL}/conversations`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim() || part.startsWith(":")) continue;

          const dataLines = part
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""));

          if (!dataLines.length) continue;

          const payloadText = dataLines.join("\n");
          const event = JSON.parse(payloadText);

          switch (event.type) {
            case "started":
              onStarted?.(event);
              break;
            case "retrieved":
              onRetrieved?.(event);
              break;
            case "chunk":
              onChunk?.(event);
              break;
            case "done":
              onDone?.(event);
              break;
            case "error":
              onError?.(event.error || event);
              break;
            default:
              if (event.started) onStarted?.(event);
              if (event.retrieved) onRetrieved?.(event);
              if (event.chunk) onChunk?.(event);
              if (event.done) onDone?.(event);
              if (event.error) onError?.(event.error);
              break;
          }
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        onAbort?.();
        return;
      }
      onError?.(error);
    }
  })();

  return {
    abort: () => controller.abort(),
  };
}

export default {
  api,
  userLogin,
  userRegister,
  userLogout,
  getConversations,
  getMessages,
  sendMessageStream,
};
