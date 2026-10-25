<template>
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
          <el-option label="DeepSeek-v4-Pro" value="deepseek-v4-pro" />
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
          @click="emit('stop')"
          title="Stop output"
        >
          <IconStop />
        </button>
        <!-- 未输出：显示发送按钮 -->
        <button
          v-else
          class="send-btn"
          @click="emit('send')"
          :disabled="!input.trim()"
        >
          <IconSend />
        </button>
      </div>
    </div>
    <div class="input-hint">{{ t("input_hint") }}</div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { IconSend, IconStop } from "@/components/icons";
import { locale, t } from "@/i18n";

const input = defineModel({ type: String, required: true });
const modelName = defineModel("modelName", { type: String, required: true });
const useNetwork = defineModel("useNetwork", { type: Boolean, required: true });
defineProps({ isStreaming: Boolean });
const emit = defineEmits(["send", "stop"]);
const textareaRef = ref(null);

function handleKeyDown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    emit("send");
  }
}

watch(
  input,
  () => {
    const textarea = textareaRef.value;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  },
  { flush: "post" },
);
</script>

<style lang="scss" scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
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
  transition:
    color 0.2s ease,
    opacity 0.2s ease;
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

@media (max-width: 640px) {
  .input-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 640px) {
  .model-select {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .network-toggle {
    justify-content: center;
    width: 100%;
  }
}
</style>
