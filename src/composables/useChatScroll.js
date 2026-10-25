import { nextTick } from "vue";

export function useChatScroll({
  currentConvId,
  messagesContainerRef,
  messagesEndRef,
  getConversationMessageState,
  setConversationMessageState,
  loadConversationMessages,
}) {
  const HISTORY_LOAD_THRESHOLD = 80;

  function persistConversationScroll(conversationId = currentConvId.value) {
    if (!messagesContainerRef.value) return;

    setConversationMessageState(conversationId, {
      scrollTop: messagesContainerRef.value.scrollTop,
    });
  }

  async function scrollToBottom(behavior = "auto") {
    await nextTick();
    messagesEndRef.value?.scrollIntoView({ behavior, block: "end" });
    persistConversationScroll();
  }

  async function restoreConversationScroll(conversationId) {
    await nextTick();

    if (!messagesContainerRef.value || currentConvId.value !== conversationId) {
      return;
    }

    const state = getConversationMessageState(conversationId);
    if (Number.isFinite(state.scrollTop)) {
      messagesContainerRef.value.scrollTop = state.scrollTop;
    } else {
      messagesContainerRef.value.scrollTop =
        messagesContainerRef.value.scrollHeight;
    }

    persistConversationScroll(conversationId);
  }

  async function loadOlderMessages(conversationId) {
    if (!conversationId || currentConvId.value !== conversationId) return;

    const state = getConversationMessageState(conversationId);
    if (
      !state.hasMore ||
      state.isLoadingHistory ||
      !state.oldestLoadedMessageId
    ) {
      return;
    }

    const previousScrollHeight = messagesContainerRef.value?.scrollHeight || 0;
    const previousScrollTop = messagesContainerRef.value?.scrollTop || 0;

    await loadConversationMessages(conversationId, {
      beforeMessageId: state.oldestLoadedMessageId,
    });
    await nextTick();

    if (!messagesContainerRef.value || currentConvId.value !== conversationId) {
      return;
    }

    const scrollDelta =
      messagesContainerRef.value.scrollHeight - previousScrollHeight;
    messagesContainerRef.value.scrollTop = previousScrollTop + scrollDelta;
    persistConversationScroll(conversationId);
  }

  function handleMessagesScroll() {
    persistConversationScroll();

    if (!messagesContainerRef.value || !currentConvId.value) return;
    if (messagesContainerRef.value.scrollTop > HISTORY_LOAD_THRESHOLD) return;

    loadOlderMessages(currentConvId.value).catch((error) => {
      console.error("loadOlderMessages error:", error);
    });
  }

  return {
    persistConversationScroll,
    scrollToBottom,
    restoreConversationScroll,
    handleMessagesScroll,
  };
}
