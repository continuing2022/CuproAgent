import axios from "axios";

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
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject({ message: error.message || "Network Error" });
  },
);

// 在请求头中注入 token（如果存在）
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
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
      const token = localStorage.getItem("token");
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
