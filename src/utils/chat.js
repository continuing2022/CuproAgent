export function normalizeConversationsResponse(response, fallbackTitle) {
  const items = Array.isArray(response) ? response : response?.items || [];
  return items.map((item) => ({
    id: item.conversation_id,
    title: item.title || fallbackTitle,
    timestamp: new Date(
      item.updated_at || item.created_at || Date.now(),
    ).getTime(),
    lastMessage: item.last_message || "",
  }));
}

export function normalizeMessagesResponse(response) {
  const messages = Array.isArray(response) ? response : response?.messages || [];
  return messages.map((message, index) => {
    const normalizedId =
      message?.id ??
      message?.message_id ??
      `${message?.role || "message"}-${message?.created_at || index}`;

    return {
      ...message,
      id: normalizedId,
      message_id: message?.message_id ?? normalizedId,
      role: message?.role || "assistant",
      content: typeof message?.content === "string" ? message.content : "",
      created_at: message?.created_at || null,
    };
  });
}

export function createLocalConversation(title, timestamp = Date.now()) {
  return {
    id: undefined,
    title,
    timestamp,
    _local: true,
  };
}

export function appendOrUpdateStreamingMessage(
  messages,
  tempId,
  chunk = "",
  overrides = {},
) {
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
