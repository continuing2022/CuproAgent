import api from "./http";

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
