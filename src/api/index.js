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

export async function userLogin(payload) {
  const res = await api.post("/auth/login", payload);
  return res.data;
}

export async function userRegister(payload) {
  const res = await api.post("/auth/register", payload);
  return res.data;
}

export default {
  userLogin,
  userRegister,
  api,
};
