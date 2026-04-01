<template>
  <div class="oragen-container" :class="{ collapsed }">
    <transition name="sidebar">
      <Sidebar
        v-if="sidebarOpen"
        :sidebarOpen="sidebarOpen"
        :conversations="conversations"
        :currentConvId="currentConvId"
        :createNewConversation="createNewConversation"
        :deleteConversation="deleteConversation"
        :setSidebarOpen="setSidebarOpen"
        :setCurrentConvId="setCurrentConvId"
        :formatTime="formatTime"
      />
    </transition>

    <!-- 主聊天区?-->
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
        <div v-if="currentConv.length === 0" class="welcome-screen">
          <div class="welcome-logo">CU</div>
          <h2>{{ t("welcome_title") }}</h2>
          <p>{{ t("welcome_desc") }}</p>
          <div class="suggestion-cards">
            <div class="suggestion-card" @click="input = t('suggestion_1')">
              <div class="card-icon">💬</div>
              <div class="card-title">{{ t("suggestion_1") }}</div>
            </div>
            <div class="suggestion-card" @click="input = t('suggestion_2')">
              <div class="card-icon">✨</div>
              <div class="card-title">{{ t("suggestion_2") }}</div>
            </div>
            <div class="suggestion-card" @click="input = t('suggestion_3')">
              <div class="card-icon">✍️</div>
              <div class="card-title">{{ t("suggestion_3") }}</div>
            </div>
            <div class="suggestion-card" @click="input = t('suggestion_4')">
              <div class="card-icon">📚</div>
              <div class="card-title">{{ t("suggestion_4") }}</div>
            </div>
          </div>
        </div>
        <div v-else class="messages-list">
          <div
            v-for="msg in currentConv"
            :key="msg.id"
            class="message"
            :class="msg.role"
          >
            <div class="message-avatar">
              {{ msg.role === "user" ? "U" : " CU" }}
            </div>
            <div class="message-content">
              <div v-html="renderContent(msg.content)"></div>
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
              placeholder="选择模型"
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
              active-text="联网"
              inactive-text="本地"
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
              @click="handleAbort"
              title="中断"
            >
              <IconStop />
            </button>
            <button
              v-else
              class="send-btn"
              @click="handleSend"
              :disabled="!input.trim() || isStreaming"
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
import { ref, reactive, computed, watch, onMounted } from "vue";
import Sidebar from "../components/Sidebar.vue";
import {
  getConversations,
  sendMessage,
  sendMessageStream,
  getMessages,
  deleteConversation as apiDeleteConversation,
} from "@/api";
import { IconMenu, IconSend, IconStop } from "../components/icons";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import { t, locale } from "@/i18n";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const renderContent = (text) => {
  try {
    const raw = md.render(text || "");
    return DOMPurify.sanitize(raw);
  } catch (e) {
    return DOMPurify.sanitize(String(text || ""));
  }
};
// 响应式数?
const input = ref("");
const isStreaming = ref(false);
const useNetwork = ref(false);
const modelName = ref("qwen-plus");
const sidebarOpen = ref(true);
const collapsed = ref(false);
const currentConvId = ref(null);
const textareaRef = ref(null);
const messagesEndRef = ref(null);
// 当前正在流式输出的消息临?id（用于只在该消息显示光标?
const streamingMsgId = ref(null);
// 当前活动的流对象（用于中断）
const currentStream = ref(null);

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

// setter helpers ?Sidebar 组件通过 props 调用以保持父级状?
const setSidebarOpen = (v) => (sidebarOpen.value = v);
// 设置当前对话 ID 并加载对应消息
const setCurrentConvId = async (v) => {
  // 当前点击的就是当前会话，直接返回
  currentConvId.value = v;
  if (v === undefined) {
    currentConv.value = [];
    return;
  }
  try {
    const msgs = await getMessages(v);
    currentConv.value = Array.isArray(msgs.messages) ? msgs.messages : [];
  } catch (e) {
    console.error("getMessages error:", e);
  }
};

// 对话列表
const conversations = reactive([]);

// 计算当前选中的对?
const currentConv = ref([]);

// 监听消息变化，自动滚动到底部
watch(
  () => currentConv.value.length,
  () => {
    nextTick(() => {
      if (messagesEndRef.value) {
        messagesEndRef.value.scrollIntoView({ behavior: "smooth" });
      }
    });
  },
);
// 监听输入框内容变化，自动调整高度
watch(input, () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto";
    textareaRef.value.style.height =
      Math.min(textareaRef.value.scrollHeight, 200) + "px";
  }
});

// 发送消息处理函?
const handleSend = async () => {
  if (!input.value.trim() || isStreaming.value) return;
  const content = input.value.trim();
  input.value = "";
  isStreaming.value = true;
  try {
    const makeTempId = () =>
      `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    currentConv.value.push({ role: "user", content, _tempId: makeTempId() });
    const conv = conversations.find((c) => c.id === currentConvId.value);
    let payload = { content };
    // include user-selected model and optional network search config
    payload.model = modelName.value || "qwen-plus";
    if (useNetwork.value) payload.networkConfig = { search: true };
    if (!conv || !conv._local) {
      payload.conversation_id = currentConvId.value;
    } else {
      payload.title = content.slice(0, 15) || conv.title;
    }

    // 先添加一个空?assistant 占位，用于流式追?
    const assistantMsg = {
      role: "assistant",
      content: "",
      _tempId: makeTempId(),
    };
    // 标记当前正在流式的消?id（模板中只在该消息显示光标）
    streamingMsgId.value = assistantMsg._tempId;
    currentConv.value.push(assistantMsg);

    const stream = sendMessageStream(payload, {
      onMessage(data) {
        // data 可能为字符串 chunk，或对象 { started: true, conversation_id }
        if (typeof data === "string") {
          // 流式内容，追加到 assistantMsg
          currentConv.value = currentConv.value.map((msg) => {
            if (msg._tempId === assistantMsg._tempId) {
              return {
                ...msg,
                content: msg.content + data,
              };
            }
            return msg;
          });
        } else if (data && data.started) {
          // 后端通知已开始并返回 conversation_id（用于本?_local 会话?
          const newConvId = data.conversation_id;
          if (conv && conv._local && newConvId) {
            conv.id = newConvId;
            delete conv._local;
            currentConvId.value = newConvId;
          }
        }
      },
      onDone(obj) {
        // obj: { done: true, conversation_id, message_id }
        if (obj && obj.conversation_id) {
          const newConvId = obj.conversation_id;
          const target = conversations.find(
            (c) => c.id === (newConvId || currentConvId.value),
          );
          if (conv && conv._local && newConvId) {
            conv.id = newConvId;
            delete conv._local;
            currentConvId.value = newConvId;
          }
          if (target && (!target.title || target.title === t("new_chat")))
            target.title = content.slice(0, 15);
          if (target) target.timestamp = Date.now();
        }
        if (obj && obj.message_id) assistantMsg.id = obj.message_id;
        // 清除流式标记
        streamingMsgId.value = null;
        isStreaming.value = false;
        currentStream.value = null;
      },
      onError(err) {
        console.error("sendMessageStream error:", err);
        // 清除流式标记
        streamingMsgId.value = null;
        isStreaming.value = false;
        currentStream.value = null;
      },
    });

    // 保存当前流对象以便可以中?
    currentStream.value = stream;

    // 如果需要在将来支持中断，可以调用：currentStream.value.abort()
  } catch (e) {
    console.error("sendMessage error:", e);
    isStreaming.value = false;
  }
};

// 键盘事件处理
const handleKeyDown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

// 中断当前流并做清?
const handleAbort = () => {
  const tempId = streamingMsgId.value;
  if (currentStream.value && typeof currentStream.value.abort === "function") {
    try {
      currentStream.value.abort();
    } catch (e) {
      console.error("abort error:", e);
    }
  }
  // 在流式消息上追加已中断提?
  if (tempId) {
    currentConv.value = currentConv.value.map((msg) => {
      if (msg._tempId === tempId) {
        return { ...msg, content: (msg.content || "") + "（已中断）" };
      }
      return msg;
    });
  }
  streamingMsgId.value = null;
  isStreaming.value = false;
  currentStream.value = null;
};

// 对话列表初始化（兼容后端直接返回数组?{ items: [] }?
const initConversations = async () => {
  try {
    const res = await getConversations();
    const raw = Array.isArray(res) ? res : res && res.items ? res.items : [];
    if (raw && raw.length > 0) {
      const normalized = raw.map((it) => ({
        id: it.conversation_id,
        title: it.title || t("new_chat"),
        messages: Array.isArray(it.messages) ? it.messages : [],
        timestamp: new Date(it.updated_at).getTime(),
      }));
      conversations.splice(0, conversations.length, ...normalized);
      // currentConvId.value = normalized[0].id;
      setCurrentConvId(normalized[0].id);
      try {
        const msgs = await getMessages(currentConvId.value);
        const conv = conversations.find((c) => c.id === currentConvId.value);
        if (conv) conv.messages = Array.isArray(msgs) ? msgs : [];
      } catch (e) {
        console.error("getMessages error:", e);
      }
    }
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
  }
};

onMounted(() => {
  initConversations();
});

// 创建新对话（在前端先创建本地临时会话，发送第一条消息时同步到后端）
const createNewConversation = () => {
  // 判断当前是否存在本地未同步会?
  const hasLocal = conversations.some((c) => c._local);
  if (hasLocal) {
    // 切换到该会话
    const localConv = conversations.find((c) => c._local);
    currentConvId.value = localConv.id;
    setCurrentConvId(localConv.id);
    return;
  }
  const newConv = {
    id: undefined,
    title: t("new_chat"),
    messages: [],
    timestamp: Date.now(),
    _local: true,
  };
  conversations.unshift(newConv);
  currentConvId.value = newConv.id;
  setCurrentConvId(newConv.id);
};

// 删除对话
const deleteConversation = async (conv) => {
  if (conversations.length === 1) return;
  if (conv.id === undefined) {
    // 本地未同步会话，直接删除
    const index = conversations.findIndex((c) => c === conv);
    if (index !== undefined) {
      // 删除会话
      conversations.splice(index, 1);
      // 如果删除的是当前会话，切换到第一个会?
      if (currentConvId.value === conv.id) {
        currentConvId.value = conversations[0].id;
        setCurrentConvId(currentConvId.value);
      }
    }
    return;
  }
  try {
    await apiDeleteConversation(conv.id);
    const index = conversations.findIndex((c) => c.id === conv.id);
    if (index !== undefined) {
      conversations.splice(index, 1);
      if (currentConvId.value === conv.id) {
        currentConvId.value = conversations[0].id;
        setCurrentConvId(currentConvId.value);
      }
    }
  } catch (e) {
    console.error("deleteConversation error:", e);
  }
};

// 格式化时?
const formatTime = (timestamp) => {
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
};

// 辅助函数：nextTick 封装
const nextTick = (callback) => {
  Promise.resolve().then(callback);
};

// watch 去监?conversations 的长?如果等于0 便创建一个新的对?
watch(
  () => conversations.length,
  (newLength) => {
    if (newLength === 0) {
      createNewConversation();
    }
  },
  { immediate: true },
);
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
/* 主聊天区?*/
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 100%;
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

.cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: #ff8c00;
  margin-left: 2px;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.input-container {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 140, 0, 0.1);
  background: #fafafa;
}

/* 整体卡片 */
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

/* ?工具?*/
.input-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

/* 模型选择宽度 */
.model-select {
  width: 140px;
}

/* ?输入?*/
.input-main {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

/* textarea */
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

/* placeholder */
.input-main textarea::placeholder {
  color: #aaa;
}

/* 发送按?*/
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
  border: none;
  background: white;
  color: #ff8c00;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
  border: 1px solid rgba(255, 140, 0, 0.15);
}

.stop-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
}

/* 主页面动画（永远只看 collapsed?*/
.chat-main {
  transition: padding-left 0.3s ease;
}

.layout.collapsed .chat-main {
  padding-left: 0;
}

/* 滚动条样?*/
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
    grid-template-columns: 1fr;
  }

  .model-select {
    width: 100%;
  }
}
</style>
