<template>
  <!-- 主容器：collapsed 控制侧边栏收起动画 -->
  <div class="oragen-container" :class="{ collapsed }">
    <!-- 侧边栏过渡动画 -->
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
      <div class="messages-container">
        <!-- 无消息时显示欢迎页 + 快捷指令 -->
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

        <!-- 有消息时显示消息列表 -->
        <div v-else class="messages-list">
          <div
            v-for="msg in currentMessages"
            :key="msg.id || msg._tempId"
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
              <div v-else v-html="renderContent(msg.content)"></div>
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

            <el-switch
              v-model="useNetwork"
              active-text="Web"
              inactive-text="Local"
              size="small"
            />
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
import MarkdownIt from "markdown-it"; // markdown 解析
import DOMPurify from "dompurify"; // XSS 安全过滤
import Sidebar from "../components/Sidebar.vue";
import { IconMenu, IconSend, IconStop } from "../components/icons";
import {
  deleteConversation,
  getConversations,
  getMessages,
  sendMessageStream,
  updateConversation as updateConversationApi,
} from "@/api"; // 接口请求
import {
  appendOrUpdateStreamingMessage,
  createLocalConversation,
  ensureActiveConversation,
  normalizeConversationsResponse,
} from "@/utils/chat"; // 聊天工具函数
import { locale, t } from "@/i18n"; // 国际化

// 初始化 markdown 解析器
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

// ======== 响应式变量 ========
const input = ref(""); // 输入框内容
const isStreaming = ref(false); // 是否正在流式输出
const useNetwork = ref(false); // 是否联网搜索
const modelName = ref("qwen-plus"); // 当前选择的模型
const sidebarOpen = ref(true); // 侧边栏是否打开
const collapsed = ref(false); // 侧边栏是否收起（动画用）
const textareaRef = ref(null); // 输入框 DOM 引用
const messagesEndRef = ref(null); // 消息滚动到底部锚点
const currentConvId = ref(null); // 当前对话 ID
const currentStream = ref(null); // 当前流式请求实例
const streamingMessageTempId = ref(null); // 流式消息临时 ID
const conversations = ref([]); // 对话列表
const messagesByConversation = ref({}); // 按对话 ID 存储消息

// 计算属性：获取当前对话的消息列表
const currentMessages = computed(() =>
  getConversationMessages(currentConvId.value),
);

// 获取指定对话的消息
function getConversationMessages(conversationId) {
  return messagesByConversation.value[conversationId] || [];
}

// 设置指定对话的消息
function setConversationMessages(conversationId, messages) {
  messagesByConversation.value[conversationId] = messages;
}

// 重置流式输出状态
function resetStreamingState() {
  isStreaming.value = false;
  streamingMessageTempId.value = null;
  currentStream.value = null;
}

// 渲染消息内容：markdown + 安全过滤
function renderContent(text) {
  try {
    return DOMPurify.sanitize(md.render(text || ""));
  } catch (error) {
    return DOMPurify.sanitize(String(text || ""));
  }
}

// 设置侧边栏开关
function setSidebarOpen(value) {
  sidebarOpen.value = value;
}

// 切换侧边栏展开/收起
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

// 加载指定对话的消息
async function loadConversationMessages(conversationId) {
  if (!conversationId) return;

  const response = await getMessages(conversationId);
  setConversationMessages(
    conversationId,
    Array.isArray(response?.messages) ? response.messages : [],
  );
}

// 切换当前选中的对话
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

// 对话列表按时间倒序排序
function sortConversationsByTimestamp() {
  conversations.value = [...conversations.value].sort(
    (left, right) => (right.timestamp || 0) - (left.timestamp || 0),
  );
}

// 创建新对话（本地临时对话）
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

// 初始化对话列表
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

// 发送第一条消息后，本地临时对话转为真实对话
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

// 更新流式输出的消息片段
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

// 更新 AI 消息状态
function updateAssistantMessage(conversationId, tempId, updater) {
  setConversationMessages(
    conversationId,
    getConversationMessages(conversationId).map((message) => {
      if (message._tempId !== tempId) return message;
      return { ...message, ...updater(message) };
    }),
  );
}

// 移除无效的 AI 消息
function removeAssistantMessage(conversationId, tempId) {
  setConversationMessages(
    conversationId,
    getConversationMessages(conversationId).filter(
      (message) => message._tempId !== tempId,
    ),
  );
}

// 结束流式输出，完成消息状态
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

// 发送消息（核心函数）
async function handleSend() {
  if (!input.value.trim() || isStreaming.value) return;

  const content = input.value.trim();
  input.value = "";
  isStreaming.value = true;

  // 临时用户消息
  const tempUserMessage = {
    role: "user",
    content,
    _tempId: `user-${Date.now()}`,
  };
  // 临时 AI 消息（占位）
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

  // 确保当前对话存在
  const activeConversation = ensureActiveConversation(
    conversations.value,
    streamConversationId,
  );

  // 请求参数
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

  // 联网搜索开关
  if (useNetwork.value) {
    payload.networkConfig = { search: true };
  }

  // 发起流式请求
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

      // 更新对话时间和标题
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
    // 主动停止输出
    onAbort() {
      finalizeAssistantMessage(
        streamConversationId,
        tempAssistantId,
        "aborted",
      );
      resetStreamingState();
    },
    // 输出出错
    onError(error) {
      console.error("sendMessageStream error:", error);
      finalizeAssistantMessage(streamConversationId, tempAssistantId, "error");
      resetStreamingState();
    },
  });
}

// 停止当前流式输出
function abortCurrentStream() {
  currentStream.value?.abort?.();
}

// 重命名对话
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

// 删除对话
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

  // 如果删除的是当前对话，自动切换到第一个
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

// 键盘回车发送消息（shift+回车换行）
function handleKeyDown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
}

// 格式化对话时间（刚刚、几分钟前、几小时前）
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

// 监听消息变化，自动滚动到底部
watch(
  () => currentMessages.value.map((message) => message.content).join("\n"),
  async () => {
    await nextTick();
    messagesEndRef.value?.scrollIntoView({ behavior: "smooth" });
  },
);

// 监听输入框内容，自动调整高度
watch(input, () => {
  if (!textareaRef.value) return;
  textareaRef.value.style.height = "auto";
  textareaRef.value.style.height = `${Math.min(
    textareaRef.value.scrollHeight,
    200,
  )}px`;
});

// 页面挂载：初始化对话列表
onMounted(() => {
  initConversations().catch((error) => {
    console.error("initConversations error:", error);
    createNewConversation();
  });
});

// 页面卸载：终止流式请求
onUnmounted(() => {
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
