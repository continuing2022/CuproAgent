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
