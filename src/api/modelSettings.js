import api from "./http";

export async function getModelSettings() {
  return (await api.get("/model-settings")).data;
}

export async function saveModelKey(provider, apiKey) {
  return (await api.put(`/model-settings/${provider}`, { apiKey })).data;
}

export async function deleteModelKey(provider) {
  return (await api.delete(`/model-settings/${provider}`)).data;
}
