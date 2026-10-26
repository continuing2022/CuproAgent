import api from "./http";

export async function uploadAttachment(file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/attachments", form, {
    headers: { "Content-Type": undefined },
    timeout: 60000,
    onUploadProgress: (event) => onProgress?.(Math.round((event.progress || 0) * 100)),
  });
  return data;
}
export async function deleteAttachment(id) { await api.delete(`/attachments/${id}`); }
export async function fetchAttachment(id) {
  const { data } = await api.get(`/attachments/${id}`, { responseType: "blob", timeout: 60000 });
  return data;
}
