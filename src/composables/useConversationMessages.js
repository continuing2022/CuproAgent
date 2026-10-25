import { ref } from "vue";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import { getMessages } from "@/api";

export function useConversationMessages() {
  const MESSAGE_PAGE_SIZE = 10;

  const LOCAL_CONVERSATION_KEY = "__local__";

  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
  });

  const messagesByConversation = ref({});

  function createConversationMessageState() {
    return {
      items: [],
      hasMore: false,
      oldestLoadedMessageId: null,
      isLoadingHistory: false,
      isLoaded: false,
      scrollTop: null,
    };
  }

  function getConversationStateKey(conversationId) {
    return conversationId ?? LOCAL_CONVERSATION_KEY;
  }

  function getConversationMessageState(conversationId) {
    const stateKey = getConversationStateKey(conversationId);
    const existingState = messagesByConversation.value[stateKey];
    if (existingState) {
      return existingState;
    }

    const nextState = createConversationMessageState();
    messagesByConversation.value[stateKey] = nextState;
    return nextState;
  }

  function setConversationMessageState(conversationId, updater) {
    const stateKey = getConversationStateKey(conversationId);
    const currentState = getConversationMessageState(conversationId);
    const nextPatch =
      typeof updater === "function" ? updater(currentState) : updater;
    const nextState = {
      ...currentState,
      ...nextPatch,
    };

    messagesByConversation.value[stateKey] = nextState;
  }

  function renderContent(text) {
    try {
      return DOMPurify.sanitize(md.render(text));
    } catch {
      return DOMPurify.sanitize(text);
    }
  }

  function withRenderedContent(message) {
    return {
      ...message,
      renderedHtml: renderContent(message.content),
    };
  }

  function mergeMessages(prependedMessages, currentMessagesList) {
    const seen = new Set();
    return [...prependedMessages, ...currentMessagesList].filter((message) => {
      const key = message.message_id ?? message.id ?? message._tempId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function updateMessageByTempId(conversationId, tempId, updater) {
    setConversationMessageState(conversationId, (state) => ({
      items: state.items.map((message) => {
        if (message._tempId !== tempId) return message;
        return withRenderedContent({
          ...message,
          ...updater(message),
        });
      }),
    }));
  }

  function moveConversationMessageState(
    sourceConversationId,
    targetConversationId,
  ) {
    if (!targetConversationId) {
      return;
    }

    const sourceStateKey = getConversationStateKey(sourceConversationId);
    const targetStateKey = getConversationStateKey(targetConversationId);
    if (sourceStateKey === targetStateKey) return;

    const sourceState = messagesByConversation.value[sourceStateKey];
    if (!sourceState) return;

    messagesByConversation.value[targetStateKey] = {
      ...sourceState,
    };
    delete messagesByConversation.value[sourceStateKey];
  }

  async function loadConversationMessages(conversationId, options = {}) {
    if (!conversationId) return;

    const { beforeMessageId = null } = options;
    const currentState = getConversationMessageState(conversationId);
    const isHistoryLoad = Boolean(beforeMessageId);

    if (isHistoryLoad) {
      if (
        currentState.isLoadingHistory ||
        !currentState.hasMore ||
        !currentState.oldestLoadedMessageId
      ) {
        return;
      }

      setConversationMessageState(conversationId, {
        isLoadingHistory: true,
      });
    }

    try {
      const response = await getMessages(conversationId, {
        limit: MESSAGE_PAGE_SIZE,
        ...(beforeMessageId ? { beforeMessageId } : {}),
      });
      const normalizedMessages = response.messages.map(withRenderedContent);

      setConversationMessageState(conversationId, (state) => ({
        items: isHistoryLoad
          ? mergeMessages(normalizedMessages, state.items)
          : normalizedMessages,
        hasMore: response.hasMore,
        oldestLoadedMessageId:
          response.oldestLoadedMessageId ??
          (isHistoryLoad ? state.oldestLoadedMessageId : null),
        isLoadingHistory: false,
        isLoaded: true,
      }));
    } catch (error) {
      setConversationMessageState(conversationId, {
        isLoadingHistory: false,
      });
      throw error;
    }
  }

  return {
    messagesByConversation,
    getConversationStateKey,
    getConversationMessageState,
    setConversationMessageState,
    withRenderedContent,
    updateMessageByTempId,
    moveConversationMessageState,
    loadConversationMessages,
  };
}
