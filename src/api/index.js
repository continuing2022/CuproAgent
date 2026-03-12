import axios from "axios";

let isRefreshing = false;
let pendingRequests = [];
const api = axios.create({
  baseURL: "http://127.0.0.1:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const status = error.response ? error.response.status : null;
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true; // 防止死循环

      // 并发请求排队，当正在刷新时返回一个承诺，刷新完成后重试
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          const retry = (token) => {
            if (!originalRequest.headers) originalRequest.headers = {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          };
          const fail = (err) => reject(err);
          pendingRequests.push({ retry, fail });
        });
      }
      // 开始刷新流程
      isRefreshing = true;
      return new Promise(async (resolve, reject) => {
        try {
          const data = await refreshToken();
          const newAccessToken = data.accessToken;
          if (!newAccessToken)
            throw new Error("No access token returned from refresh");
          localStorage.setItem("accessToken", newAccessToken);
          // 更新默认 headers，重试当前请求
          api.defaults.headers = api.defaults.headers || {};
          api.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
          if (!originalRequest.headers) originalRequest.headers = {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          // 处理排队的请求
          pendingRequests.forEach(({ retry }) => retry(newAccessToken));
          pendingRequests = [];
          resolve(api(originalRequest));
        } catch (err) {
          // 刷新失败：拒绝所有排队请求并登出
          pendingRequests.forEach(({ fail }) => fail(err));
          pendingRequests = [];
          try {
            await userLogout();
          } catch (e) {}
          reject(err);
        } finally {
          isRefreshing = false;
        }
      });
    }
    return Promise.reject(
      error.response
        ? error.response.data || error
        : { message: error.message || "Network Error" },
    );
  },
);

// 在请求头中注入 token（如果存在）
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
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
  const refreshToken = localStorage.getItem("refreshToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("username");
  localStorage.removeItem("email");
  localStorage.removeItem("role");
  const res = await api.post("/auth/logout", { refreshToken });
  return res.data;
}
// 刷新 token，获取新的 accessToken 和 refreshToken
export async function refreshToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No refresh token available");
  const res = await api.post("/auth/refresh", { refreshToken });
  return res.data;
}
// -------- 用户管理 API --------
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
  const res = await api.post(`/auth/users`, payload);
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
  const res = await api.post(`/auth/users/bulk-delete`, { userIds });
  return res.data;
}

export async function exportUsers(payload) {
  const res = await api.post(`/auth/users/export`, payload || {});
  return res.data;
}

export async function getCurrentUser() {
  const res = await api.get(`/auth/me`);
  return res.data;
}
// 获取会话列表（按时间降序）
export async function getConversations(payload) {
  const res = await api.get("/conversations", payload);
  return res.data;
}
// 开始新对话或在已有对话中继续发送消息
export async function sendMessage(payload) {
  const res = await api.post("/conversations", payload);
  return res.data;
}
// 发送消息并以 SSE 流式接收回复，回调会收到后端每次推送的 data 内容（已解析为对象）
export function sendMessageStream(
  payload,
  { onMessage, onDone, onError } = {},
) {
  const controller = new AbortController();
  const signal = controller.signal;

  (async () => {
    try {
      const headers = {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      };
      // 设置 Authorization 头
      const token = localStorage.getItem("accessToken");
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(api.defaults.baseURL + "/conversations", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buf = ""; // 用于缓存未完整的 SSE 数据块
      let doneReading = false;

      while (!doneReading) {
        const { value, done } = await reader.read();
        if (done) {
          doneReading = true;
          break;
        }
        buf += decoder.decode(value, { stream: true });
        // SSE 事件以 "\n\n" 分隔，可能包含多条
        let parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          // 忽略注释行（以 ':' 开头）
          if (!part.trim() || part.startsWith(":")) continue;
          // 合并 data 行
          const lines = part.split(/\n/);
          let dataLines = [];
          for (const line of lines) {
            if (line.startsWith("data:")) {
              dataLines.push(line.replace(/^data:\s?/, ""));
            }
          }
          if (dataLines.length === 0) continue;
          const dataStr = dataLines.join("\n");
          try {
            const obj = JSON.parse(dataStr);
            if (obj.chunk && onMessage) onMessage(obj.chunk);
            if (obj.started && onMessage)
              onMessage({
                started: true,
                conversation_id: obj.conversation_id,
              });
            if (obj.done && onDone) onDone(obj);
            if (obj.error && onError) onError(obj.error);
          } catch (e) {
            // 非 JSON 内容，则当作纯文本 chunk
            if (onMessage) onMessage(dataStr);
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      if (onError) onError(err);
    }
  })();

  return {
    abort: () => controller.abort(),
  };
}
// 取单个对话的消息列表
export async function getMessages(convId) {
  const res = await api.get(`/conversations/${convId}/messages`);
  return res.data;
}
// 删除对话（级联删除消息）
export async function deleteConversation(convId) {
  const res = await api.delete(`/conversations/${convId}`);
  return res.data;
}
export default {
  userLogin,
  userRegister,
  getConversations,
  api,
};
