import axios from "axios";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAuthSession,
} from "@/utils/authStorage";

let isRefreshing = false;
let pendingRequests = [];
const REFRESH_ENDPOINT = "/auth/refresh";

const api = axios.create({
  baseURL: "http://127.0.0.1:3000",
  timeout: 10000,
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
  return error?.response?.data || { message: error?.message || "Network Error" };
}

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
      flushPendingRequests(({ resolve }) => resolve(data.accessToken));

      originalRequest.headers = originalRequest.headers || {};
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
  try {
    const res = await api.post("/auth/logout", { refreshToken });
    return res.data;
  } finally {
    clearAuthSession();
  }
}

export async function refreshToken() {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) throw new Error("No refresh token available");
  const res = await api.post("/auth/refresh", {
    refreshToken: refreshTokenValue,
  });
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

export async function updateConversation(convId, payload) {
  const res = await api.put(`/conversations/${convId}`, payload);
  return res.data;
}

function dispatchSseEvent(event, handlers = {}) {
  const { onStarted, onRetrieved, onChunk, onDone, onError } = handlers;
  if (!event || typeof event !== "object") return;

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

function processSsePart(part, handlers) {
  if (!part.trim() || part.startsWith(":")) return;

  const dataLines = part
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""));

  if (!dataLines.length) return;

  const payloadText = dataLines.join("\n");
  let event = null;
  try {
    event = JSON.parse(payloadText);
  } catch (error) {
    // Ignore a malformed SSE frame instead of aborting the full stream.
    return;
  }

  dispatchSseEvent(event, handlers);
}

export function sendMessageStream(
  payload,
  { onStarted, onRetrieved, onChunk, onDone, onError, onAbort } = {},
) {
  const controller = new AbortController();
  const handlers = { onStarted, onRetrieved, onChunk, onDone, onError };

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
      if (!res.body) {
        throw new Error("Response body is empty");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), {
          stream: !done,
        });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        parts.forEach((part) => processSsePart(part, handlers));

        if (done) break;
      }

      if (buffer.trim()) {
        processSsePart(buffer, handlers);
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
  updateConversation,
  sendMessageStream,
};
