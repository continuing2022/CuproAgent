<template>
  <div class="oragen-container" :class="{ collapsed }">
    <transition name="sidebar">
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

    <main class="chat-main">
      <header class="chat-header">
        <button v-if="!sidebarOpen" class="menu-btn" @click="toggle()">
          <IconMenu />
        </button>
        <div class="header-content">
          <h1>CuproAgent</h1>
          <p class="subtitle">{{ t("home_subtitle") }}</p>
        </div>
      </header>

      <div class="messages-container">
        <div v-if="currentMessages.length === 0" class="welcome-screen">
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

        <div v-else class="messages-list">
          <div
            v-for="msg in currentMessages"
            :key="msg.id || msg._tempId"
            class="message"
            :class="msg.role"
          >
            <div class="message-avatar">
              {{ msg.role === "user" ? "U" : "CU" }}
            </div>
            <div class="message-content">
              <template v-if="msg.role === 'assistant' && msg.isThinking">
                <div class="thinking-bubble">
                  <span class="thinking-dots" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              </template>
              <div v-else v-html="renderContent(msg.content)"></div>
            </div>
          </div>
          <div ref="messagesEndRef"></div>
        </div>
      </div>

      <div class="input-container">
        <div class="input-wrapper">
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

            <el-switch
              v-model="useNetwork"
              active-text="Web"
              inactive-text="Local"
              size="small"
            />
          </div>

          <div class="input-main">
            <textarea
              ref="textareaRef"
              v-model="input"
              @keydown="handleKeyDown"
              :placeholder="t('input_placeholder')"
              rows="1"
              :disabled="isStreaming"
            ></textarea>

            <button
              v-if="isStreaming"
              class="stop-btn"
              @click="abortCurrentStream"
              title="Stop output"
            >
              <IconStop />
            </button>
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
} from "@/utils/chat";
import { locale, t } from "@/i18n";

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
const collapsed = ref(false);
const textareaRef = ref(null);
const messagesEndRef = ref(null);
const currentConvId = ref(null);
const currentStream = ref(null);
const streamingMessageTempId = ref(null);
const conversations = ref([]);
const messagesByConversation = ref({});

const currentMessages = computed(() =>
  getConversationMessages(currentConvId.value),
);

function getConversationMessages(conversationId) {
  return messagesByConversation.value[conversationId] || [];
}

function setConversationMessages(conversationId, messages) {
  messagesByConversation.value[conversationId] = messages;
}

function resetStreamingState() {
  isStreaming.value = false;
  streamingMessageTempId.value = null;
  currentStream.value = null;
}

function renderContent(text) {
  try {
    return DOMPurify.sanitize(md.render(text || ""));
  } catch (error) {
    return DOMPurify.sanitize(String(text || ""));
  }
}

function setSidebarOpen(value) {
  sidebarOpen.value = value;
}

function toggle() {
  collapsed.value = !collapsed.value;
  if (collapsed.value) {
    setTimeout(() => {
      sidebarOpen.value = false;
    }, 300);
  } else {
    sidebarOpen.value = true;
  }
}

async function loadConversationMessages(conversationId) {
  if (!conversationId) return;

  const response = await getMessages(conversationId);
  setConversationMessages(
    conversationId,
    Array.isArray(response?.messages) ? response.messages : [],
  );
}

async function setCurrentConversation(conversationId) {
  if (isStreaming.value) return;

  currentConvId.value = conversationId;
  if (conversationId === undefined) return;

  const activeConversation = ensureActiveConversation(
    conversations.value,
    conversationId,
  );
  if (activeConversation?._local) return;

  await loadConversationMessages(conversationId);
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
    setConversationMessages(
      existingLocal.id,
      getConversationMessages(existingLocal.id),
    );
    return;
  }

  const localConversation = createLocalConversation(t("new_chat"));
  conversations.value = [localConversation, ...conversations.value];
  currentConvId.value = localConversation.id;
  setConversationMessages(localConversation.id, []);
}

async function initConversations() {
  const response = await getConversations();
  const normalized = normalizeConversationsResponse(response, t("new_chat"));
  conversations.value = normalized;

  if (!normalized.length) {
    createNewConversation();
    return;
  }

  currentConvId.value = normalized[0].id;
  await loadConversationMessages(normalized[0].id);
}

function updateConversationAfterStart(sourceConversationId, newConversationId, content) {
  const localConversation = conversations.value.find((item) => item._local);
  if (!localConversation || !newConversationId) return sourceConversationId;

  localConversation.id = newConversationId;
  if (!localConversation.title || localConversation.title === t("new_chat")) {
    localConversation.title = content.slice(0, 15) || t("new_chat");
  }
  localConversation.timestamp = Date.now();
  delete localConversation._local;

  const sourceMessages = getConversationMessages(sourceConversationId);
  setConversationMessages(newConversationId, sourceMessages);
  if (sourceConversationId !== newConversationId) {
    delete messagesByConversation.value[sourceConversationId];
  }

  if (currentConvId.value === sourceConversationId) {
    currentConvId.value = newConversationId;
  }

  sortConversationsByTimestamp();
  return newConversationId;
}

function updateAssistantPlaceholder(conversationId, tempId, chunk) {
  setConversationMessages(
    conversationId,
    appendOrUpdateStreamingMessage(
      getConversationMessages(conversationId),
      tempId,
      chunk,
      { isThinking: false, status: "streaming" },
    ),
  );
}

function updateAssistantMessage(conversationId, tempId, updater) {
  setConversationMessages(
    conversationId,
    getConversationMessages(conversationId).map((message) => {
      if (message._tempId !== tempId) return message;
      return { ...message, ...updater(message) };
    }),
  );
}

function removeAssistantMessage(conversationId, tempId) {
  setConversationMessages(
    conversationId,
    getConversationMessages(conversationId).filter(
      (message) => message._tempId !== tempId,
    ),
  );
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

  const tempUserMessage = {
    role: "user",
    content,
    _tempId: `user-${Date.now()}`,
  };
  const tempAssistantId = `assistant-${Date.now()}`;
  const tempAssistantMessage = {
    role: "assistant",
    content: "",
    _tempId: tempAssistantId,
    isThinking: true,
    status: "waiting",
  };

  let streamConversationId = currentConvId.value;
  const currentList = getConversationMessages(streamConversationId);
  setConversationMessages(streamConversationId, [
    ...currentList,
    tempUserMessage,
    tempAssistantMessage,
  ]);

  streamingMessageTempId.value = tempAssistantId;

  const activeConversation = ensureActiveConversation(
    conversations.value,
    streamConversationId,
  );

  const payload = {
    content,
    model: modelName.value,
  };

  if (activeConversation && !activeConversation._local && streamConversationId) {
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
        event.chunk || "",
      );
    },
    onDone(event) {
      const doneConversationId = event.conversation_id || streamConversationId;
      setConversationMessages(
        doneConversationId,
        getConversationMessages(doneConversationId).map((message) =>
          message._tempId === tempAssistantId
            ? {
                ...message,
                id: event.message_id,
                isThinking: false,
                status: "done",
              }
            : message,
        ),
      );

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
      sortConversationsByTimestamp();
      resetStreamingState();
    },
    onAbort() {
      finalizeAssistantMessage(streamConversationId, tempAssistantId, "aborted");
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
    delete messagesByConversation.value[conversation.id];
  } else {
    await deleteConversation(conversation.id);
    conversations.value = conversations.value.filter(
      (item) => item.id !== conversation.id,
    );
    delete messagesByConversation.value[conversation.id];
  }

  if (currentConvId.value === conversation.id) {
    const nextConversation = conversations.value[0];
    if (nextConversation) {
      currentConvId.value = nextConversation.id;
      if (!nextConversation._local) {
        await loadConversationMessages(nextConversation.id);
      }
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

watch(
  () => currentMessages.value.map((message) => message.content).join("\n"),
  async () => {
    await nextTick();
    messagesEndRef.value?.scrollIntoView({ behavior: "smooth" });
  },
);

watch(input, () => {
  if (!textareaRef.value) return;
  textareaRef.value.style.height = "auto";
  textareaRef.value.style.height = `${Math.min(
    textareaRef.value.scrollHeight,
    200,
  )}px`;
});

onMounted(() => {
  initConversations().catch((error) => {
    console.error("initConversations error:", error);
    createNewConversation();
  });
});

onUnmounted(() => {
  abortCurrentStream();
});
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

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
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 140, 0, 0.1);
  background: #fafafa;
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
  width: 140px;
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
}
</style>
