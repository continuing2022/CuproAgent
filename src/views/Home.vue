<template>
  <div class="oragen-container">
    <!-- 侧边栏过渡动画 -->
    <transition name="sidebar" appear>
      <Sidebar
        v-if="sidebarOpen"
        :sidebarOpen="sidebarOpen"
        :conversations="conversations"
        :currentConvId="currentConvId"
        :createNewConversation="createNewConversation"
        :deleteConversation="removeConversation"
        :renameConversation="renameConversation"
        :setSidebarOpen="setSidebarOpen"
        :setCurrentConvId="setCurrentConversation"
        :formatTime="formatTime"
      />
    </transition>
    <transition name="home-toast">
      <div
        v-if="homeToast.visible"
        class="home-toast"
        :class="`is-${homeToast.type}`"
        aria-live="polite"
      >
        <span class="home-toast-dot" aria-hidden="true"></span>
        <span class="home-toast-text">{{ homeToast.message }}</span>
      </div>
    </transition>

    <!-- 聊天主内容区 -->
    <main class="chat-main">
      <!-- 顶部导航栏 -->
      <header class="chat-header">
        <!-- 侧边栏收起后显示菜单按钮 -->
        <button v-if="!sidebarOpen" class="menu-btn" @click="toggle()">
          <IconMenu />
        </button>
        <div class="header-content">
          <h1>CuproAgent</h1>
          <p class="subtitle">{{ t("home_subtitle") }}</p>
        </div>
      </header>

      <!-- 消息展示容器 -->
      <div
        ref="messagesContainerRef"
        class="messages-container"
        @scroll="handleMessagesScroll"
      >
        <!-- 无消息时显示欢迎页 + 快捷指令 -->
        <div v-if="showWelcomeScreen" class="welcome-screen">
          <div class="welcome-logo">CU</div>
          <h2>{{ t("welcome_title") }}</h2>
          <p>{{ t("welcome_desc") }}</p>
          <div class="suggestion-cards">
            <div class="suggestion-card" @click="input = t('suggestion_1')">
              <div class="card-icon">&#128172;</div>
              <div class="card-title">{{ t("suggestion_1") }}</div>
            </div>
            <div class="suggestion-card" @click="input = t('suggestion_2')">
              <div class="card-icon">&#10024;</div>
              <div class="card-title">{{ t("suggestion_2") }}</div>
            </div>
            <div class="suggestion-card" @click="input = t('suggestion_3')">
              <div class="card-icon">&#9997;</div>
              <div class="card-title">{{ t("suggestion_3") }}</div>
            </div>
            <div class="suggestion-card" @click="input = t('suggestion_4')">
              <div class="card-icon">&#128218;</div>
              <div class="card-title">{{ t("suggestion_4") }}</div>
            </div>
          </div>
        </div>

        <!-- 有消息时显示消息列表 -->
        <div v-else class="messages-list">
          <div
            v-if="currentMessageState.isLoadingHistory"
            class="history-status"
          >
            {{ locale === "zh" ? "正在加载更早消息..." : "Loading older messages..." }}
          </div>
          <div
            v-for="msg in currentMessages"
            :key="msg.id || msg.message_id || msg._tempId"
            class="message"
            :class="msg.role"
          >
            <!-- 头像：用户 U / 助手 CU -->
            <div class="message-avatar">
              {{ msg.role === "user" ? "U" : "CU" }}
            </div>
            <div class="message-content">
              <!-- AI 思考中动画 -->
              <template v-if="msg.role === 'assistant' && msg.isThinking">
                <div class="thinking-bubble">
                  <span class="thinking-dots" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              </template>
              <!-- 渲染 markdown 消息 -->
              <div v-else v-html="msg.renderedHtml"></div>
            </div>
          </div>
          <!-- 消息滚动到底部的锚点 -->
          <div ref="messagesEndRef"></div>
        </div>
      </div>

      <!-- 底部输入框区域 -->
      <div class="input-container">
        <div class="input-wrapper">
          <!-- 工具栏：模型选择 + 联网开关 -->
          <div class="input-toolbar">
            <el-select
              v-model="modelName"
              placeholder="Select model"
              size="small"
              class="model-select"
              popper-class="model-select-popper"
            >
              <el-option label="Qwen-plus" value="qwen-plus" />
              <el-option label="Qwen-math-turbo" value="qwen-math-turbo" />
              <el-option label="Qwen-max" value="qwen-max" />
              <el-option label="Kimi-K2.5" value="kimi-k2.5" />
            </el-select>

            <div class="network-toggle" :class="{ 'is-network': useNetwork }">
              <span class="toggle-label toggle-label-local">
                {{ locale === "zh" ? "本地" : "Local" }}
              </span>
              <el-switch
                v-model="useNetwork"
                size="small"
                class="network-switch-control"
              />
              <span class="toggle-label toggle-label-web">
                {{ locale === "zh" ? "联网" : "Web" }}
              </span>
            </div>
          </div>

          <!-- 输入框主体 -->
          <div class="input-main">
            <textarea
              ref="textareaRef"
              v-model="input"
              @keydown="handleKeyDown"
              :placeholder="t('input_placeholder')"
              rows="1"
              :disabled="isStreaming"
            ></textarea>

            <!-- 流式输出中：显示停止按钮 -->
            <button
              v-if="isStreaming"
              class="stop-btn"
              @click="abortCurrentStream"
              title="Stop output"
            >
              <IconStop />
            </button>
            <!-- 未输出：显示发送按钮 -->
            <button
              v-else
              class="send-btn"
              @click="handleSend"
              :disabled="!input.trim()"
            >
              <IconSend />
            </button>
          </div>
        </div>
        <div class="input-hint">{{ t("input_hint") }}</div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import Sidebar from "../components/Sidebar.vue";
import { IconMenu, IconSend, IconStop } from "../components/icons";
import {
  deleteConversation,
  getConversations,
  getMessages,
  sendMessageStream,
  updateConversation as updateConversationApi,
} from "@/api";
import {
  appendOrUpdateStreamingMessage,
  createLocalConversation,
  ensureActiveConversation,
  normalizeConversationsResponse,
  normalizeMessagesResponse,
} from "@/utils/chat";
import { consumePendingFlashMessage } from "@/utils/flashMessage";
import { locale, t } from "@/i18n";

const MESSAGE_PAGE_SIZE = 10;
const HISTORY_LOAD_THRESHOLD = 80;
const LOCAL_CONVERSATION_KEY = "__local__";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const input = ref("");
const isStreaming = ref(false);
const useNetwork = ref(false);
const modelName = ref("qwen-plus");
const sidebarOpen = ref(true);
const textareaRef = ref(null);
const messagesContainerRef = ref(null);
const messagesEndRef = ref(null);
const currentConvId = ref(null);
const currentStream = ref(null);
const streamingMessageTempId = ref(null);
const conversations = ref([]);
const messagesByConversation = ref({});

const homeToast = ref({
  visible: false,
  type: "success",
  message: "",
});
let homeToastTimer = null;

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

function createConversationMessageState(overrides = {}) {
  return {
    items: [],
    hasMore: false,
    oldestLoadedMessageId: null,
    isLoadingHistory: false,
    isLoaded: false,
    scrollTop: null,
    ...overrides,
  };
}

function getConversationStateKey(conversationId) {
  return conversationId ?? LOCAL_CONVERSATION_KEY;
}

function ensureConversationMessageState(conversationId) {
  const stateKey = getConversationStateKey(conversationId);
  const existingState = messagesByConversation.value[stateKey];
  if (existingState && Array.isArray(existingState.items)) {
    return existingState;
  }

  const nextState = createConversationMessageState();
  messagesByConversation.value[stateKey] = nextState;
  return nextState;
}

function getConversationMessageState(conversationId) {
  return ensureConversationMessageState(conversationId);
}

function setConversationMessageState(conversationId, updater) {
  const stateKey = getConversationStateKey(conversationId);
  const currentState = ensureConversationMessageState(conversationId);
  const nextPatch =
    typeof updater === "function" ? updater(currentState) : updater;
  const nextState = {
    ...currentState,
    ...(nextPatch || {}),
  };

  if (!Array.isArray(nextState.items)) {
    nextState.items = currentState.items || [];
  }

  messagesByConversation.value[stateKey] = nextState;
  return nextState;
}

function getConversationMessages(conversationId) {
  return getConversationMessageState(conversationId).items;
}

function setConversationMessages(conversationId, messages) {
  return setConversationMessageState(conversationId, { items: messages });
}

function renderContent(text) {
  try {
    return DOMPurify.sanitize(md.render(text || ""));
  } catch (error) {
    return DOMPurify.sanitize(String(text || ""));
  }
}

function withRenderedContent(message) {
  const content = typeof message?.content === "string" ? message.content : "";
  return {
    ...message,
    content,
    renderedHtml: renderContent(content),
  };
}

function normalizeRenderedMessages(response) {
  return normalizeMessagesResponse(response).map(withRenderedContent);
}

function getMessageIdentity(message, fallbackIndex) {
  return (
    message?.message_id ??
    message?.id ??
    message?._tempId ??
    `${message?.role || "message"}-${fallbackIndex}`
  );
}

function mergeMessages(prependedMessages, currentMessagesList) {
  const seen = new Set();
  return [...prependedMessages, ...currentMessagesList].filter(
    (message, index) => {
      const key = getMessageIdentity(message, index);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
  );
}

function updateMessageByTempId(conversationId, tempId, updater) {
  setConversationMessageState(conversationId, (state) => ({
    items: state.items.map((message) => {
      if (message._tempId !== tempId) return message;
      return withRenderedContent({
        ...message,
        ...(updater(message) || {}),
      });
    }),
  }));
}

function moveConversationMessageState(sourceConversationId, targetConversationId) {
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

function resetStreamingState() {
  isStreaming.value = false;
  streamingMessageTempId.value = null;
  currentStream.value = null;
}

function setSidebarOpen(value) {
  sidebarOpen.value = value;
}

function toggle() {
  sidebarOpen.value = !sidebarOpen.value;
}

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

function showPendingFlashMessage() {
  const flashMessage = consumePendingFlashMessage();
  if (!flashMessage?.message) return;

  if (homeToastTimer) {
    clearTimeout(homeToastTimer);
    homeToastTimer = null;
  }

  homeToast.value = {
    visible: true,
    type: flashMessage.type || "success",
    message: flashMessage.message,
  };

  homeToastTimer = window.setTimeout(() => {
    homeToast.value.visible = false;
    homeToastTimer = null;
  }, 2200);
}

async function loadConversationMessages(conversationId, options = {}) {
  if (!conversationId) return createConversationMessageState();

  const { beforeMessageId = null, force = false } = options;
  const currentState = ensureConversationMessageState(conversationId);
  const isHistoryLoad = Boolean(beforeMessageId);

  if (!isHistoryLoad && currentState.isLoaded && !force) {
    return currentState;
  }

  if (isHistoryLoad) {
    if (
      currentState.isLoadingHistory ||
      !currentState.hasMore ||
      !currentState.oldestLoadedMessageId
    ) {
      return currentState;
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
    const normalizedMessages = normalizeRenderedMessages(response);

    if (isHistoryLoad) {
      setConversationMessageState(conversationId, (state) => ({
        items: mergeMessages(normalizedMessages, state.items),
        hasMore: Boolean(response?.hasMore),
        oldestLoadedMessageId:
          response?.oldestLoadedMessageId ??
          normalizedMessages[0]?.message_id ??
          state.oldestLoadedMessageId,
        isLoadingHistory: false,
        isLoaded: true,
      }));
    } else {
      setConversationMessageState(conversationId, (state) => ({
        items: normalizedMessages,
        hasMore: Boolean(response?.hasMore),
        oldestLoadedMessageId:
          response?.oldestLoadedMessageId ??
          normalizedMessages[0]?.message_id ??
          null,
        isLoadingHistory: false,
        isLoaded: true,
        scrollTop: state.scrollTop,
      }));
    }

    return getConversationMessageState(conversationId);
  } catch (error) {
    setConversationMessageState(conversationId, {
      isLoadingHistory: false,
    });
    throw error;
  }
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

async function setCurrentConversation(conversationId, options = {}) {
  if (isStreaming.value) return;

  const { force = true } = options;
  currentConvId.value = conversationId;
  const activeConversation = ensureActiveConversation(
    conversations.value,
    conversationId,
  );
  if (conversationId === undefined && !activeConversation?._local) return;

  ensureConversationMessageState(conversationId);

  if (!activeConversation?._local) {
    await loadConversationMessages(conversationId, { force });
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
    ensureConversationMessageState(existingLocal.id);
    void restoreConversationScroll(existingLocal.id);
    return;
  }

  const localConversation = createLocalConversation(t("new_chat"));
  conversations.value = [localConversation, ...conversations.value];
  currentConvId.value = localConversation.id;
  ensureConversationMessageState(localConversation.id);
}

async function initConversations() {
  const response = await getConversations();
  const normalized = normalizeConversationsResponse(response, t("new_chat"));
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
    localConversation.title = content.slice(0, 15) || t("new_chat");
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
    items: appendOrUpdateStreamingMessage(
      state.items,
      tempId,
      chunk,
      { isThinking: false, status: "streaming" },
    ).map((message) =>
      message._tempId === tempId ? withRenderedContent(message) : message,
    ),
  }));

  if (currentConvId.value === conversationId) {
    void scrollToBottom("auto");
  }
}

function updateAssistantMessage(conversationId, tempId, updater) {
  updateMessageByTempId(conversationId, tempId, updater);
}

function removeAssistantMessage(conversationId, tempId) {
  setConversationMessageState(conversationId, (state) => ({
    items: state.items.filter((message) => message._tempId !== tempId),
  }));
}

function finalizeAssistantMessage(conversationId, tempId, status) {
  const currentMessage = getConversationMessages(conversationId).find(
    (message) => message._tempId === tempId,
  );

  if (currentMessage?.content) {
    updateAssistantMessage(conversationId, tempId, () => ({
      isThinking: false,
      status,
    }));
  } else {
    removeAssistantMessage(conversationId, tempId);
  }
}

async function handleSend() {
  if (!input.value.trim() || isStreaming.value) return;

  const content = input.value.trim();
  input.value = "";
  isStreaming.value = true;

  const tempUserMessage = withRenderedContent({
    role: "user",
    content,
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
  ensureConversationMessageState(streamConversationId);
  setConversationMessageState(streamConversationId, (state) => ({
    items: [...state.items, tempUserMessage, tempAssistantMessage],
    isLoaded: true,
  }));

  streamingMessageTempId.value = tempAssistantId;
  void scrollToBottom("smooth");

  const activeConversation = ensureActiveConversation(
    conversations.value,
    streamConversationId,
  );

  const payload = {
    content,
    model: modelName.value,
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
        : content.slice(0, 15) || t("new_chat");
  }

  if (useNetwork.value) {
    payload.networkConfig = { search: true };
  }

  currentStream.value = sendMessageStream(payload, {
    onStarted(event) {
      streamConversationId = updateConversationAfterStart(
        streamConversationId,
        event.conversation_id,
        content,
      );
    },
    onChunk(event) {
      updateAssistantPlaceholder(
        streamConversationId,
        tempAssistantId,
        typeof event?.chunk === "string" ? event.chunk : "",
      );
    },
    onDone(event) {
      const doneConversationId = event.conversation_id || streamConversationId;
      updateAssistantMessage(doneConversationId, tempAssistantId, () => ({
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
          currentConversation.title = content.slice(0, 15);
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
      console.error("sendMessageStream error:", error);
      finalizeAssistantMessage(streamConversationId, tempAssistantId, "error");
      resetStreamingState();
    },
  });
}

function abortCurrentStream() {
  currentStream.value?.abort?.();
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

  if (conversation._local) {
    conversations.value = conversations.value.filter(
      (item) => item !== conversation,
    );
    delete messagesByConversation.value[getConversationStateKey(conversation.id)];
  } else {
    await deleteConversation(conversation.id);
    conversations.value = conversations.value.filter(
      (item) => item.id !== conversation.id,
    );
    delete messagesByConversation.value[getConversationStateKey(conversation.id)];
  }

  if (currentConvId.value === conversation.id) {
    const nextConversation = conversations.value[0];
    if (nextConversation) {
      await setCurrentConversation(nextConversation.id);
    }
  }
}

function handleKeyDown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSend();
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

watch(input, () => {
  if (!textareaRef.value) return;
  textareaRef.value.style.height = "auto";
  textareaRef.value.style.height = `${Math.min(
    textareaRef.value.scrollHeight,
    200,
  )}px`;
});

onMounted(() => {
  showPendingFlashMessage();
  initConversations().catch((error) => {
    console.error("initConversations error:", error);
    createNewConversation();
  });
});

onUnmounted(() => {
  if (homeToastTimer) {
    clearTimeout(homeToastTimer);
    homeToastTimer = null;
  }
  abortCurrentStream();
});
</script>

<style lang="scss" scoped>
@use "@/styles/index" as *;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}

.oragen-container {
  display: flex;
  height: 100vh;
  background: #fffbf5;
  color: #2d2d2d;
  overflow: hidden;
}

:deep(.sidebar-enter-active),
:deep(.sidebar-leave-active) {
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s ease,
    filter 0.22s ease;
}

:deep(.sidebar-enter-from),
:deep(.sidebar-leave-to) {
  opacity: 0;
  transform: translateX(-24px) scale(0.98);
  filter: blur(6px);
}

.home-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  z-index: 3700;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 14px 18px;
  border-radius: 16px;
  color: #7a4a16;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 170, 92, 0.24);
  box-shadow:
    0 16px 32px rgba(234, 122, 20, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.04);
  transform: translateX(-50%);
  backdrop-filter: blur(10px);
}

.home-toast-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffb14a 0%, #ff8c00 100%);
  box-shadow: 0 0 0 6px rgba(255, 177, 74, 0.14);
}

.home-toast-text {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.home-toast-enter-active,
.home-toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.home-toast-enter-from,
.home-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  transition: padding-left 0.3s ease;
}

.chat-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 140, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-btn {
  background: none;
  border: none;
  color: #ff8c00;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.menu-btn:hover {
  background: rgba(255, 140, 0, 0.1);
}

.header-content h1 {
  font-size: 24px;
  font-weight: 600;
  color: #ff8c00;
  margin-bottom: 2px;
}

.subtitle {
  font-size: 13px;
  color: #999;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.welcome-logo {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #ffb84d 0%, #ff8c00 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(255, 140, 0, 0.2);
}

.welcome-screen h2 {
  font-size: 28px;
  margin-bottom: 8px;
  color: #2d2d2d;
}

.welcome-screen > p {
  font-size: 16px;
  color: #666;
  margin-bottom: 40px;
}

.suggestion-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 600px;
  width: 100%;
}

.suggestion-card {
  padding: 20px;
  background: white;
  border: 2px solid rgba(255, 140, 0, 0.15);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-card:hover {
  border-color: #ffb84d;
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(255, 140, 0, 0.15);
}

.card-icon {
  font-size: 28px;
  margin-bottom: 12px;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #2d2d2d;
}

.messages-list {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.history-status {
  padding: 0 0 16px;
  text-align: center;
  font-size: 13px;
  color: #a26a2c;
}

.message {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: linear-gradient(135deg, #ffb84d 0%, #ff8c00 100%);
  color: white;
}

.message.assistant .message-avatar {
  background: #f5f5f5;
  color: #ff8c00;
}

.message-content {
  flex: 1;
  padding: 12px 16px;
  line-height: 1.6;
  font-size: 15px;
}

.message.user {
  flex-direction: row-reverse;
}

.message.user .message-content {
  background: linear-gradient(135deg, #ffb84d 0%, #ff8c00 100%);
  color: white;
  border-radius: 12px 12px 4px 12px;
  margin-right: auto;
}

.message.assistant .message-content {
  background: white;
  color: #2d2d2d;
  border-radius: 12px 12px 12px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.thinking-bubble {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #8a6a3d;
  min-height: 28px;
}

.thinking-label {
  font-size: 14px;
  font-weight: 500;
}

.thinking-dots {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffb84d 0%, #ff8c00 100%);
  animation: thinkingPulse 1.1s ease-in-out infinite;
}

.thinking-dots span:nth-child(2) {
  animation-delay: 0.18s;
}

.thinking-dots span:nth-child(3) {
  animation-delay: 0.36s;
}

@keyframes thinkingPulse {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0) scale(0.9);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px) scale(1);
  }
}

.input-container {
  padding: 10px 20px;
  border-top: 1px solid rgba(255, 140, 0, 0.1);
}

.input-wrapper {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fff;
  border: 2px solid rgba(255, 140, 0, 0.2);
  border-radius: 16px;
  padding: 12px;
  transition: all 0.2s;
}

.input-wrapper:focus-within {
  border-color: #ffb84d;
  box-shadow: 0 4px 16px rgba(255, 140, 0, 0.1);
}

.input-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.model-select {
  width: 168px;
}

.model-select:deep(.el-select__wrapper),
.model-select:deep(.el-input__wrapper) {
  min-height: 36px;
  border-radius: 12px;
  background: linear-gradient(180deg, #fffdf9 0%, #fff7ef 100%);
  box-shadow:
    0 0 0 1px rgba(255, 181, 77, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.model-select:deep(.el-select__wrapper:hover),
.model-select:deep(.el-input__wrapper:hover) {
  box-shadow:
    0 0 0 1px rgba(255, 166, 77, 0.56),
    0 8px 20px rgba(255, 140, 0, 0.08);
}

.model-select:deep(.el-select__wrapper.is-focused),
.model-select:deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 2px rgba(255, 166, 77, 0.28),
    0 10px 22px rgba(255, 140, 0, 0.1);
}

.model-select:deep(.el-select__selected-item),
.model-select:deep(.el-input__inner) {
  color: #8a4d16;
  font-weight: 600;
}

.model-select:deep(.el-select__caret),
.model-select:deep(.el-input__suffix-inner) {
  color: #d78322;
}

.network-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, #fffdfa 0%, #fff5e8 100%);
  border: 1px solid rgba(255, 184, 77, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 8px 18px rgba(255, 140, 0, 0.06);
}

.toggle-label {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.toggle-label-local {
  color: #ff8c00;
}

.toggle-label-web {
  color: #9c8a77;
}

.network-toggle.is-network .toggle-label-local {
  color: #b8a797;
}

.network-toggle.is-network .toggle-label-web {
  color: #ff8c00;
}

.network-switch-control {
  --el-switch-on-color: #ff9b2f;
  --el-switch-off-color: #e7dccd;
}

.network-switch-control:deep(.el-switch__core) {
  min-width: 42px;
  border: 1px solid rgba(255, 184, 77, 0.35);
  box-shadow: inset 0 1px 2px rgba(151, 97, 29, 0.08);
}

.network-switch-control:deep(.el-switch__action) {
  box-shadow: 0 2px 6px rgba(140, 81, 18, 0.16);
}

.input-main {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.input-main textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 15px;
  line-height: 1.6;
  padding: 8px 0;
  color: #2d2d2d;
  background: transparent;
}

.input-main textarea::placeholder {
  color: #aaa;
}

.send-btn {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #ffb84d 0%, #ff8c00 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 6px 14px rgba(255, 140, 0, 0.3);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.input-hint {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 12px;
}

.stop-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(255, 140, 0, 0.15);
  background: white;
  color: #ff8c00;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.stop-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 140, 0, 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 140, 0, 0.5);
}

@media (max-width: 640px) {
  .input-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .model-select {
    width: 100%;
  }

  .network-toggle {
    justify-content: center;
    width: 100%;
  }
}
</style>
