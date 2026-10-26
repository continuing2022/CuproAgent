import { useChatScroll } from "@/composables/useChatScroll";
import { useConversationMessages } from "@/composables/useConversationMessages";
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  deleteConversation,
  getConversations,
  sendMessageStream,
  updateConversation as updateConversationApi,
} from "@/api";
import {
  appendOrUpdateStreamingMessage,
  createLocalConversation,
  ensureActiveConversation,
} from "@/utils/chat";
import { locale, t } from "@/i18n";

export function useChatSession() {
  const {
    messagesByConversation,
    getConversationStateKey,
    getConversationMessageState,
    setConversationMessageState,
    withRenderedContent,
    updateMessageByTempId,
    moveConversationMessageState,
    loadConversationMessages,
  } = useConversationMessages();

  const input = ref("");
  const attachments = ref([]);
  const chatError = ref("");

  const isStreaming = ref(false);

  const useNetwork = ref(false);

  const modelName = ref("qwen-plus");

  const messagesContainerRef = ref(null);

  const messagesEndRef = ref(null);

  const currentConvId = ref(null);

  const currentStream = ref(null);

  const conversations = ref([]);

  const {
    persistConversationScroll,
    scrollToBottom,
    restoreConversationScroll,
    handleMessagesScroll,
  } = useChatScroll({
    currentConvId,
    messagesContainerRef,
    messagesEndRef,
    getConversationMessageState,
    setConversationMessageState,
    loadConversationMessages,
  });

  const currentMessageState = computed(() =>
    getConversationMessageState(currentConvId.value),
  );

  const currentMessages = computed(() => currentMessageState.value.items);

  const showWelcomeScreen = computed(() => {
    const activeConversation = ensureActiveConversation(
      conversations.value,
      currentConvId.value,
    );

    if (activeConversation?._local || !currentConvId.value) {
      return currentMessages.value.length === 0;
    }

    return (
      currentMessageState.value.isLoaded && currentMessages.value.length === 0
    );
  });

  function resetStreamingState() {
    isStreaming.value = false;
    currentStream.value = null;
  }

  async function setCurrentConversation(conversationId) {
    if (isStreaming.value) return;

    currentConvId.value = conversationId;
    const activeConversation = ensureActiveConversation(
      conversations.value,
      conversationId,
    );
    if (conversationId === undefined && !activeConversation?._local) return;

    if (!activeConversation?._local) {
      await loadConversationMessages(conversationId);
    }

    await restoreConversationScroll(conversationId);
  }

  function sortConversationsByTimestamp() {
    conversations.value = [...conversations.value].sort(
      (left, right) => (right.timestamp || 0) - (left.timestamp || 0),
    );
  }

  function createNewConversation() {
    const existingLocal = conversations.value.find((item) => item._local);
    if (existingLocal) {
      currentConvId.value = existingLocal.id;
      void restoreConversationScroll(existingLocal.id);
      return;
    }

    const localConversation = createLocalConversation(t("new_chat"));
    conversations.value = [localConversation, ...conversations.value];
    currentConvId.value = localConversation.id;
  }

  async function initConversations() {
    const response = await getConversations();
    const normalized = response.map((conversation) => ({
      ...conversation,
      title: conversation.title || t("new_chat"),
    }));
    conversations.value = normalized;

    if (!normalized.length) {
      createNewConversation();
      return;
    }

    await setCurrentConversation(normalized[0].id);
  }

  function updateConversationAfterStart(
    sourceConversationId,
    newConversationId,
    content,
  ) {
    const localConversation = conversations.value.find((item) => item._local);
    if (!localConversation || !newConversationId) return sourceConversationId;

    localConversation.id = newConversationId;
    if (!localConversation.title || localConversation.title === t("new_chat")) {
      localConversation.title = content.slice(0, 15);
    }
    localConversation.timestamp = Date.now();
    delete localConversation._local;

    moveConversationMessageState(sourceConversationId, newConversationId);

    if (currentConvId.value === sourceConversationId) {
      currentConvId.value = newConversationId;
    }

    sortConversationsByTimestamp();
    return newConversationId;
  }

  function updateAssistantPlaceholder(conversationId, tempId, chunk) {
    setConversationMessageState(conversationId, (state) => ({
      items: appendOrUpdateStreamingMessage(state.items, tempId, chunk, {
        isThinking: false,
        status: "streaming",
      }).map((message) =>
        message._tempId === tempId ? withRenderedContent(message) : message,
      ),
    }));

    if (currentConvId.value === conversationId) {
      void scrollToBottom("auto");
    }
  }

  function removeAssistantMessage(conversationId, tempId) {
    setConversationMessageState(conversationId, (state) => ({
      items: state.items.filter((message) => message._tempId !== tempId),
    }));
  }

  function finalizeAssistantMessage(conversationId, tempId, status) {
    const currentMessage = getConversationMessageState(
      conversationId,
    ).items.find((message) => message._tempId === tempId);

    if (currentMessage?.content) {
      updateMessageByTempId(conversationId, tempId, () => ({
        isThinking: false,
        status,
      }));
    } else {
      removeAssistantMessage(conversationId, tempId);
    }
  }

  async function handleSend() {
    const content = input.value.trim();
    const files = attachments.value;
    if ((!content && !files.length) || isStreaming.value || files.some(file => file.status !== "ready")) return;
    chatError.value = "";
    const displayTitle = content || files[0]?.name || t("new_chat");
    if ((files.length || currentMessages.value.some(message => message.attachments?.length)) && !modelName.value.startsWith("qwen")) modelName.value = "qwen-plus";
    if (files.some(file => file.mimeType.startsWith("image/")) || currentMessages.value.some(message => message.attachments?.some(file => file.mimeType.startsWith("image/")))) modelName.value = "qwen3-vl-plus";
    input.value = "";
    attachments.value = [];
    isStreaming.value = true;

    const tempUserMessage = withRenderedContent({
      role: "user",
      content,
      attachments: files.map(({ id, name, mimeType, size }) => ({ id, name, mimeType, size })),
      _tempId: `user-${Date.now()}`,
    });
    const tempAssistantId = `assistant-${Date.now()}`;
    const tempAssistantMessage = withRenderedContent({
      role: "assistant",
      content: "",
      _tempId: tempAssistantId,
      isThinking: true,
      status: "waiting",
    });

    let streamConversationId = currentConvId.value;
    setConversationMessageState(streamConversationId, (state) => ({
      items: [...state.items, tempUserMessage, tempAssistantMessage],
      isLoaded: true,
    }));

    void scrollToBottom("smooth");

    const activeConversation = ensureActiveConversation(
      conversations.value,
      streamConversationId,
    );

    const payload = {
      content,
      model: modelName.value,
      attachment_ids: files.map(file => file.id),
    };

    if (
      activeConversation &&
      !activeConversation._local &&
      streamConversationId
    ) {
      payload.conversation_id = streamConversationId;
    } else {
      payload.title =
        activeConversation?.title && activeConversation.title !== t("new_chat")
          ? activeConversation.title
          : displayTitle.slice(0, 15);
    }

    if (useNetwork.value) {
      payload.networkConfig = { search: true };
    }

    let messageStarted = false;
    currentStream.value = sendMessageStream(payload, {
      onStarted(event) {
        messageStarted = true;
        streamConversationId = updateConversationAfterStart(
          streamConversationId,
          event.conversation_id,
          displayTitle,
        );
        updateMessageByTempId(streamConversationId, tempUserMessage._tempId, () => ({ message_id: event.user_message_id }));
      },
      onChunk(event) {
        updateAssistantPlaceholder(
          streamConversationId,
          tempAssistantId,
          event.chunk,
        );
      },
      onRetrieved(event) {
        if (["missing_user_dashscope_key", "remote_rag_disabled", "retrieval_error"].includes(event.meta?.reason)) {
          chatError.value = event.meta.message;
        }
      },
      onDone(event) {
        const doneConversationId =
          event.conversation_id || streamConversationId;
        updateMessageByTempId(doneConversationId, tempAssistantId, () => ({
          id: event.message_id,
          message_id: event.message_id,
          isThinking: false,
          status: "done",
        }));

        const currentConversation = ensureActiveConversation(
          conversations.value,
          doneConversationId,
        );
        if (currentConversation) {
          currentConversation.timestamp = Date.now();
          if (
            !currentConversation.title ||
            currentConversation.title === t("new_chat")
          ) {
            currentConversation.title = displayTitle.slice(0, 15);
          }
        }
        persistConversationScroll(doneConversationId);
        sortConversationsByTimestamp();
        resetStreamingState();
      },
      onAbort() {
        finalizeAssistantMessage(
          streamConversationId,
          tempAssistantId,
          "aborted",
        );
        resetStreamingState();
      },
      onError(error) {
        chatError.value = error.message || String(error);
        if (!messageStarted) {
          input.value = content;
          attachments.value = files.map(({ previewUrl, ...file }) => file);
          setConversationMessageState(streamConversationId, (state) => ({ items: state.items.filter(message => message._tempId !== tempUserMessage._tempId) }));
          if (chatError.value.includes("Qwen3-VL-Plus")) modelName.value = "qwen3-vl-plus";
          else if (chatError.value.includes("Qwen")) modelName.value = "qwen-plus";
        }
        console.error("sendMessageStream error:", error);
        finalizeAssistantMessage(
          streamConversationId,
          tempAssistantId,
          "error",
        );
        resetStreamingState();
      },
    });
  }

  function abortCurrentStream() {
    currentStream.value?.abort();
  }

  async function renameConversation(conversation, title) {
    const nextTitle = String(title || "").trim();
    if (!nextTitle) return;

    if (conversation._local || !conversation.id) {
      conversation.title = nextTitle;
      conversation.timestamp = Date.now();
      sortConversationsByTimestamp();
      return;
    }

    const response = await updateConversationApi(conversation.id, {
      title: nextTitle,
    });
    const updatedAt = response?.conversation?.updated_at
      ? new Date(response.conversation.updated_at).getTime()
      : Date.now();

    conversation.title = nextTitle;
    conversation.timestamp = updatedAt;
    sortConversationsByTimestamp();
  }

  async function removeConversation(conversation) {
    if (conversations.value.length === 1) return;

    if (!conversation._local) {
      await deleteConversation(conversation.id);
    }
    conversations.value = conversations.value.filter((item) =>
      conversation._local ? item !== conversation : item.id !== conversation.id,
    );
    delete messagesByConversation.value[
      getConversationStateKey(conversation.id)
    ];

    if (currentConvId.value === conversation.id) {
      const nextConversation = conversations.value[0];
      if (nextConversation) {
        await setCurrentConversation(nextConversation.id);
      }
    }
  }

  function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("just_now");
    if (minutes < 60) return `${minutes}${t("minutes_ago")}`;
    if (hours < 24) return `${hours}${t("hours_ago")}`;
    if (days < 7) return `${days}${t("days_ago")}`;
    return new Date(timestamp).toLocaleDateString(
      locale.value === "zh" ? "zh-CN" : "en-US",
    );
  }
  onMounted(() => {
    initConversations().catch((error) => {
      console.error("initConversations error:", error);
      createNewConversation();
    });
  });
  onUnmounted(abortCurrentStream);

  return {
    input,
    attachments,
    chatError,
    isStreaming,
    useNetwork,
    modelName,
    messagesContainerRef,
    messagesEndRef,
    currentConvId,
    conversations,
    currentMessageState,
    currentMessages,
    showWelcomeScreen,
    handleMessagesScroll,
    setCurrentConversation,
    createNewConversation,
    handleSend,
    abortCurrentStream,
    renameConversation,
    removeConversation,
    formatTime,
  };
}
