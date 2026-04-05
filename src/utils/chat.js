export function normalizeConversationsResponse(response, fallbackTitle) {
  const items = Array.isArray(response) ? response : response?.items || [];
  return items.map((item) => ({
    id: item.conversation_id,
    title: item.title || fallbackTitle,
    timestamp: new Date(item.updated_at || item.created_at || Date.now()).getTime(),
    lastMessage: item.last_message || "",
  }));
}

export function createLocalConversation(title, timestamp = Date.now()) {
  return {
    id: undefined,
    title,
    timestamp,
    // 本地会话先给前端渲染，等首个 started 事件回来再替换成真实会话 id。
    _local: true,
  };
}

export function appendOrUpdateStreamingMessage(
  messages,
  tempId,
  chunk = "",
  overrides = {},
) {
  // 流式消息统一按 tempId 更新，避免 chunk 过程中重复插入 assistant 气泡。
  return messages.map((message) => {
    if (message._tempId !== tempId) return message;
    return {
      ...message,
      content: `${message.content || ""}${chunk}`,
      ...overrides,
    };
  });
}

export function ensureActiveConversation(conversations, conversationId) {
  return conversations.find((conversation) => conversation.id === conversationId);
}
