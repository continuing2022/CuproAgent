import api from "./http";
import {
  normalizeConversationsResponse,
  normalizeMessagesResponse,
} from "@/utils/chat";

export async function getConversations(params = {}) {
  const res = await api.get("/conversations", { params });
  return normalizeConversationsResponse(res.data, "");
}

export async function getMessages(convId, params = {}) {
  const res = await api.get(`/conversations/${convId}/messages`, { params });
  const messages = normalizeMessagesResponse(res.data);
  return {
    messages,
    hasMore: Boolean(res.data?.hasMore),
    oldestLoadedMessageId:
      res.data?.oldestLoadedMessageId ?? messages[0]?.message_id ?? null,
  };
}

export async function deleteConversation(convId) {
  const res = await api.delete(`/conversations/${convId}`);
  return res.data;
}

export async function updateConversation(convId, payload) {
  const res = await api.put(`/conversations/${convId}`, payload);
  return res.data;
}
