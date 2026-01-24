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
      :openSettings="openSettings"
      :handleLogout="handleLogout"
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
        <div v-if="currentConv.messages.length === 0" class="welcome-screen">
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
            v-for="msg in currentConv.messages"
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
                v-if="
                  msg.role === 'assistant' &&
                  isStreaming &&
                  msg.id ===
                    currentConv.messages[currentConv.messages.length - 1].id
                "
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
import { ref, reactive, computed, watch } from "vue";
import { useRouter } from "vue-router";
import Sidebar from "../components/Sidebar.vue";
import { IconMenu, IconSend } from "../components/icons";
// 响应式数据
const input = ref("");
const isStreaming = ref(false);
const sidebarOpen = ref(true);
const currentConvId = ref(1);
const textareaRef = ref(null);
const messagesEndRef = ref(null);
const showUserModal = ref(false);

// setter helpers 供 Sidebar 组件通过 props 调用以保持父级状态
const setSidebarOpen = (v) => (sidebarOpen.value = v);
const setCurrentConvId = (v) => (currentConvId.value = v);
const setShowUserModal = (v) => (showUserModal.value = v);

// 对话列表（使用 reactive 处理复杂对象）
const conversations = reactive([
  { id: 1, title: "新对话", messages: [], timestamp: Date.now() },
]);

// 计算当前选中的对话
const currentConv = computed(() => {
  return (
    conversations.find((c) => c.id === currentConvId.value) || conversations[0]
  );
});

// 监听消息变化，自动滚动到底部
watch(
  () => currentConv.value.messages.length,
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

  const userMessage = {
    role: "user",
    content: input.value.trim(),
    id: Date.now(),
  };

  // 更新对话列表
  conversations.forEach((conv) => {
    if (conv.id === currentConvId.value) {
      conv.messages.push(userMessage);
      // 如果是第一个消息，更新对话标题
      if (conv.messages.length === 1) {
        conv.title = input.value.slice(0, 30);
      }
      conv.timestamp = Date.now();
    }
  });

  input.value = "";
  isStreaming.value = true;

  // 模拟流式输出
  const responses = [
    "我是 CuproAgent 智能助手，很高兴为您服务！",
    "我可以帮您解答问题、提供建议、进行创意创作等多种任务。",
    "基于脐橙色系的温暖设计，希望能给您带来愉悦的交互体验。",
    "有什么我可以帮助您的吗？",
  ];

  const randomResponse =
    responses[Math.floor(Math.random() * responses.length)];
  const botMessage = { role: "assistant", content: "", id: Date.now() + 1 };

  // 添加空的助手消息
  conversations.forEach((conv) => {
    if (conv.id === currentConvId.value) {
      conv.messages.push(botMessage);
    }
  });

  // 流式输出效果
  for (let i = 0; i <= randomResponse.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 30));
    conversations.forEach((conv) => {
      if (conv.id === currentConvId.value) {
        const lastMsg = conv.messages[conv.messages.length - 1];
        if (lastMsg.role === "assistant") {
          lastMsg.content = randomResponse.slice(0, i);
        }
      }
    });
  }

  isStreaming.value = false;
};

// 键盘事件处理
const handleKeyDown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

// 创建新对话
const createNewConversation = () => {
  const newConv = {
    id: Date.now(),
    title: "新对话",
    messages: [],
    timestamp: Date.now(),
  };
  conversations.unshift(newConv);
  currentConvId.value = newConv.id;
};

// 删除对话
const deleteConversation = (id) => {
  if (conversations.length === 1) return;
  const index = conversations.findIndex((c) => c.id === id);
  if (index !== -1) {
    conversations.splice(index, 1);
    if (currentConvId.value === id) {
      currentConvId.value = conversations[0].id;
    }
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

const openSettings = () => {
  showUserModal.value = false;
  if (router && router.push) {
    router.push("/setting").catch(() => {});
  }
};

const handleLogout = () => {
  showUserModal.value = false;
  // TODO: 在此添加实际退出逻辑（清除 token、调用 API 等）
  alert("已退出登录");
};
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

.message.user .message-content {
  background: linear-gradient(135deg, #ffb84d 0%, #ff8c00 100%);
  color: white;
  border-radius: 12px 12px 4px 12px;
  max-width: 80%;
  margin-left: auto;
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
