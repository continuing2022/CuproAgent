<template>
  <div class="messages-list">
    <div v-if="isLoadingHistory" class="history-status">
      {{
        locale === "zh" ? "正在加载更早消息..." : "Loading older messages..."
      }}
    </div>
    <div
      v-for="msg in messages"
      :key="msg.id || msg.message_id || msg._tempId"
      class="message"
      :class="msg.role"
    >
      <!-- 头像：用户 U / 助手 CU -->
      <div class="message-avatar">
        {{ msg.role === "user" ? "U" : "CU" }}
      </div>
      <div class="message-content">
        <MessageAttachments v-if="msg.attachments?.length" :files="msg.attachments" />
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
        <div v-else class="markdown-body" @click="copyCode" v-html="msg.renderedHtml"></div>
        <div v-if="msg.role === 'assistant' && (['aborted', 'error', 'timeout'].includes(msg.status) || (msg.status === 'streaming' && !msg._tempId))" class="history-status" role="status">
          {{ locale === 'zh' ? '此回答未完成' : 'This response is incomplete' }}
        </div>
      </div>
    </div>
    <!-- 消息滚动到底部的锚点 -->
    <slot />
  </div>
</template>

<script setup>
import { locale } from "@/i18n";
import { onUnmounted } from "vue";
import MessageAttachments from "./MessageAttachments.vue";
import "./markdown.css";
defineProps({
  messages: { type: Array, required: true },
  isLoadingHistory: Boolean,
});
const copyTimers = new Set();
async function copyCode(event) {
  const button = event.target.closest("button[data-copy-code]");
  if (!button || !event.currentTarget.contains(button)) return;
  const code = button.closest(".code-block")?.querySelector("pre code");
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code.textContent);
    if (button.isConnected) button.textContent = locale.value === "zh" ? "已复制" : "Copied";
  } catch {
    if (button.isConnected) button.textContent = locale.value === "zh" ? "复制失败" : "Copy failed";
  }
  const timer = setTimeout(() => {
    if (button.isConnected) button.textContent = locale.value === "zh" ? "复制代码" : "Copy code";
    copyTimers.delete(timer);
  }, 1800);
  copyTimers.add(timer);
}
onUnmounted(() => copyTimers.forEach(clearTimeout));
</script>

<style lang="scss" scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
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
  min-width: 0;
  flex: 1;
  padding: 12px 16px;
  line-height: 1.8;
  font-size: 15px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
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
  padding: 20px 24px;
  background: white;
  color: #2d2d2d;
  border-radius: 12px 12px 12px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

@media (max-width: 640px) {
  .message { gap: 10px; }
  .message-avatar { width: 30px; height: 30px; font-size: 12px; }
  .message.assistant .message-content { padding: 16px; }
}

.thinking-bubble {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #8a6a3d;
  min-height: 28px;
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
</style>
