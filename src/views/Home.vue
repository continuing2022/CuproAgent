<template>
  <div class="oragen-container">
    <Sidebar
      v-if="sidebarOpen"
      :sidebarOpen="sidebarOpen"
      :conversations="conversations"
      :currentConvId="currentConvId"
      :showUserModal="showUserModal"
      :createNewConversation="createNewConversation"
      :deleteConversation="deleteConversation"
      :setSidebarOpen="setSidebarOpen"
      :setCurrentConvId="setCurrentConvId"
      :setShowUserModal="setShowUserModal"
      :formatTime="formatTime"
    />
    <!-- 主聊天区域 -->
    <main class="chat-main">
      <header class="chat-header">
        <button
          v-if="!sidebarOpen"
          class="menu-btn"
          @click="sidebarOpen = true"
        >
          <IconMenu />
        </button>
        <div class="header-content">
          <h1>CuproAgent</h1>
          <p class="subtitle">智能助手 · 铜及铜合金知识问答</p>
        </div>
      </header>

      <div class="messages-container">
        <div v-if="currentConv.length === 0" class="welcome-screen">
          <div class="welcome-logo">CU</div>
          <h2>你好！我是 CuproAgent</h2>
          <p>一个智能、温暖的 AI 助手</p>
          <div class="suggestion-cards">
            <div class="suggestion-card" @click="input = '介绍一下你自己'">
              <div class="card-icon">💬</div>
              <div class="card-title">介绍一下你自己</div>
            </div>
            <div class="suggestion-card" @click="input = '你可以做什么？'">
              <div class="card-icon">✨</div>
              <div class="card-title">你可以做什么？</div>
            </div>
            <div
              class="suggestion-card"
              @click="input = '告诉我铜及铜合金的应用'"
            >
              <div class="card-icon">✍️</div>
              <div class="card-title">告诉我铜及铜合金的应用</div>
            </div>
            <div
              class="suggestion-card"
              @click="input = '推荐一些铜及铜合金学习资源'"
            >
              <div class="card-icon">📚</div>
              <div class="card-title">推荐一些铜及铜合金学习资源</div>
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
              {{ msg.content }}
              <span
                v-if="msg.role === 'assistant' && isStreaming"
                class="cursor"
                >|</span
              >
            </div>
          </div>
          <div ref="messagesEndRef"></div>
        </div>
      </div>

      <div class="input-container">
        <div class="input-wrapper">
          <textarea
            ref="textareaRef"
            v-model="input"
            @keydown="handleKeyDown"
            placeholder="输入消息，按 Enter 发送，Shift + Enter 换行..."
            rows="1"
            :disabled="isStreaming"
          ></textarea>
          <button
            class="send-btn"
            @click="handleSend"
            :disabled="!input.trim() || isStreaming"
          >
            <IconSend />
          </button>
        </div>
        <div class="input-hint">基于橙色系设计 · 温暖智能交互体验</div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import Sidebar from "../components/Sidebar.vue";
import {
  getConversations,
  sendMessage,
  getMessages,
  deleteConversation as apiDeleteConversation,
} from "@/api";
import { IconMenu, IconSend } from "../components/icons";
// 响应式数据
const input = ref("");
const isStreaming = ref(false);
const sidebarOpen = ref(true);
const currentConvId = ref(null);
const textareaRef = ref(null);
const messagesEndRef = ref(null);
const showUserModal = ref(false);

// setter helpers 供 Sidebar 组件通过 props 调用以保持父级状态
const setSidebarOpen = (v) => (sidebarOpen.value = v);
const setCurrentConvId = async (v) => {
  if (v === undefined) currentConv.value = [];
  currentConvId.value = v;
  try {
    const msgs = await getMessages(v);
    currentConv.value = Array.isArray(msgs.messages) ? msgs.messages : [];
  } catch (e) {
    console.error("getMessages error:", e);
  }
};
const setShowUserModal = (v) => (showUserModal.value = v);

// 对话列表
const conversations = reactive([]);

// 计算当前选中的对话
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

// 发送消息处理函数
const handleSend = async () => {
  if (!input.value.trim() || isStreaming.value) return;
  const content = input.value.trim();
  input.value = "";
  isStreaming.value = true;
  try {
    // 判断当前会话是否为本地临时会话（尚未持久化到后端）
    currentConv.value.push({ role: "user", content });
    const conv = conversations.find((c) => c.id === currentConvId.value);
    let payload = { content };
    if (!conv || !conv._local) {
      // 已存在后端会话，传递 conversation_id
      payload.conversation_id = currentConvId.value;
    } else {
      // 本地新会话，不传 conversation_id，传 title 以便后端创建
      payload.title = conv.title || content.slice(0, 30);
    }

    const res = await sendMessage(payload);

    // 如果后端返回了新的 conversation id，更新本地会话
    const newConvId = res && res.conversation_id;
    if (conv && conv._local && newConvId) {
      conv.id = newConvId;
      delete conv._local;
      currentConvId.value = newConvId;
    }
    // 追加助手消息（流式更新）
    currentConv.value.push({
      role: "assistant",
      content: res.assistant.content,
    });

    // 更新标题与时间（若需要）
    const target = conversations.find(
      (c) => c.id === (newConvId || currentConvId.value),
    );
    if (target && (!target.title || target.title === "新对话"))
      target.title = content.slice(0, 30);
    if (target) target.timestamp = Date.now();
  } catch (e) {
    console.error("sendMessage error:", e);
  } finally {
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

// 对话列表初始化（兼容后端直接返回数组或 { items: [] }）
const initConversations = async () => {
  try {
    const res = await getConversations();
    const raw = Array.isArray(res) ? res : res && res.items ? res.items : [];
    if (raw && raw.length > 0) {
      const normalized = raw.map((it) => ({
        id: it.conversation_id,
        title: it.title || "新对话",
        messages: Array.isArray(it.messages) ? it.messages : [],
        timestamp: new Date(it.updated_at).getTime(),
      }));
      conversations.splice(0, conversations.length, ...normalized);
      currentConvId.value = normalized[0].id;
      setCurrentConvId(currentConvId.value);
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
  const newConv = {
    id: undefined,
    title: "新对话",
    messages: [],
    timestamp: Date.now(),
    _local: true,
  };
  conversations.unshift(newConv);
  currentConvId.value = newConv.id;
  setCurrentConvId(newConv.id);
};

// 删除对话
const deleteConversation = async (id) => {
  if (conversations.length === 1) return;
  try {
    await apiDeleteConversation(id);
    const index = conversations.findIndex((c) => c.id === id);
    if (index !== -1) {
      conversations.splice(index, 1);
      if (currentConvId.value === id) {
        currentConvId.value = conversations[0].id;
        // 加载新选中会话的消息
        try {
          const msgs = await getMessages(currentConvId.value);
          const conv = conversations.find((c) => c.id === currentConvId.value);
          if (conv) conv.messages = Array.isArray(msgs) ? msgs : [];
          // 更新数据视图
          // initConversations();
        } catch (e) {
          console.error("getMessages error:", e);
        }
      }
    }
  } catch (e) {
    console.error("deleteConversation error:", e);
  }
};

// 格式化时间
const formatTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString("zh-CN");
};

// 辅助函数：nextTick 封装
const nextTick = (callback) => {
  Promise.resolve().then(callback);
};

const router = useRouter();
</script>

<style scoped>
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
}
/* 主聊天区域 */
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
  max-width: 800px;
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
  max-width: 80%;
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
  padding: 24px;
  border-top: 1px solid rgba(255, 140, 0, 0.1);
}

.input-wrapper {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  gap: 12px;
  align-items: center;
  background: white;
  border: 2px solid rgba(255, 140, 0, 0.2);
  border-radius: 16px;
  padding: 12px 16px;
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: #ffb84d;
}

.input-wrapper textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 15px;
  font-family: inherit;
  line-height: 1.5;
  color: #2d2d2d;
}

.input-wrapper textarea::placeholder {
  color: #999;
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #ffb84d 0%, #ff8c00 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
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

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    height: 100vh;
    z-index: 1000;
  }

  .sidebar:not(.open) {
    transform: translateX(-100%);
  }

  .close-sidebar {
    display: block;
  }

  .suggestion-cards {
    grid-template-columns: 1fr;
  }

  .chat-header {
    padding: 16px;
  }

  .messages-container {
    padding: 16px;
  }

  .input-container {
    padding: 16px;
  }
}

/* 滚动条样式 */
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
</style>
