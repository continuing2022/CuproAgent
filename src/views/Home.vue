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
        <ChatWelcome v-if="showWelcomeScreen" @suggest="input = $event" />

        <!-- 有消息时显示消息列表 -->
        <ChatMessageList
          v-else
          :messages="currentMessages"
          :is-loading-history="currentMessageState.isLoadingHistory"
        >
          <div ref="messagesEndRef"></div>
        </ChatMessageList>
      </div>

      <!-- 底部输入框区域 -->
      <ChatComposer
        v-model="input"
        v-model:model-name="modelName"
        v-model:use-network="useNetwork"
        :is-streaming="isStreaming"
        @send="handleSend"
        @stop="abortCurrentStream"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useChatSession } from "@/composables/useChatSession";
import Sidebar from "../components/Sidebar.vue";
import { IconMenu } from "../components/icons";
import ChatComposer from "@/components/chat/ChatComposer.vue";
import ChatWelcome from "@/components/chat/ChatWelcome.vue";
import ChatMessageList from "@/components/chat/ChatMessageList.vue";
import { consumePendingFlashMessage } from "@/utils/flashMessage";
import { t } from "@/i18n";

const {
  input,
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
} = useChatSession();

const sidebarOpen = ref(true);

const homeToast = ref({
  visible: false,
  type: "success",
  message: "",
});

let homeToastTimer = null;

function setSidebarOpen(value) {
  sidebarOpen.value = value;
}

function toggle() {
  sidebarOpen.value = !sidebarOpen.value;
}

function showPendingFlashMessage() {
  const flashMessage = consumePendingFlashMessage();
  if (!flashMessage?.message) return;

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

onMounted(showPendingFlashMessage);
onUnmounted(() => clearTimeout(homeToastTimer));
</script>

<style lang="scss" scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
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

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
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
