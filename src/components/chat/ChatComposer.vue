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
          <el-option label="Qwen3-VL-Plus · 视觉" value="qwen3-vl-plus" />
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
      <div v-if="attachments.length" class="attachment-list">
        <div v-for="(file, index) in attachments" :key="file.localId || file.id" class="attachment-card">
          <img v-if="file.previewUrl" :src="file.previewUrl" :alt="file.name" />
          <div class="attachment-info">
            <span>{{ file.name }}</span>
            <small>{{ file.status === 'uploading' ? `${locale === 'zh' ? '上传并解析中' : 'Uploading'} ${file.progress || 0}%` : file.status === 'error' ? file.error : `${Math.ceil(file.size / 1024)} KB` }}</small>
          </div>
          <button type="button" :disabled="isStreaming || file.status === 'uploading'" :aria-label="locale === 'zh' ? '移除附件' : 'Remove attachment'" @click="removeFile(index)">×</button>
        </div>
      </div>
      <p v-if="uploadError || chatError" class="attachment-error" role="alert">{{ uploadError || chatError }}</p>
      <div class="input-main">
        <input ref="fileInputRef" type="file" hidden multiple accept=".png,.jpg,.jpeg,.webp,.pdf,.md,.txt,.docx" @change="selectFiles" />
        <button type="button" class="attach-btn" :disabled="isStreaming || isUploading || attachments.length >= 4" :title="locale === 'zh' ? '上传图片或文件' : 'Attach files'" :aria-label="locale === 'zh' ? '上传图片或文件' : 'Attach files'" @click="fileInputRef.click()"><Paperclip :size="20" /></button>
        <textarea
          ref="textareaRef"
          v-model="input"
          @keydown="handleKeyDown"
          @input="emit('clear-error')"
          @paste="handlePaste"
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
          :disabled="(!input.trim() && !attachments.length) || isUploading || attachments.some(file => file.status === 'error')"
        >
          <IconSend />
        </button>
      </div>
    </div>
    <div class="attachment-hint">{{ locale === 'zh' ? '支持粘贴图片或文件 · 图片 / PDF / MD / TXT / Word (.docx) · 最多 4 个，每个 5 MB · 附件由阿里云存储和分析' : 'Paste images or files · Images / PDF / MD / TXT / Word (.docx) · Up to 4 files, 5 MB each · Stored and analyzed by Alibaba Cloud' }}</div>
    <div class="input-hint">{{ t("input_hint") }}</div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { Paperclip } from "lucide-vue-next";
import { uploadAttachment, deleteAttachment } from "@/api/attachments";
import { IconSend, IconStop } from "@/components/icons";
import { locale, t } from "@/i18n";

const input = defineModel({ type: String, required: true });
const modelName = defineModel("modelName", { type: String, required: true });
const useNetwork = defineModel("useNetwork", { type: Boolean, required: true });
const attachments = defineModel("attachments", { type: Array, default: () => [] });
const props = defineProps({ isStreaming: Boolean, chatError: String });
const emit = defineEmits(["send", "stop", "clear-error"]);
const textareaRef = ref(null);
const fileInputRef = ref(null);
const uploadError = ref("");
const isUploading = computed(() => attachments.value.some(file => file.status === "uploading"));
const previewUrls = new Set();
let disposed = false;

function selectFiles(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = "";
  void addFiles(files);
}

function handlePaste(event) {
  const clipboard = event.clipboardData;
  if (!clipboard) return;
  // Prefer FileList; some browsers only expose clipboard files through items.
  const files = Array.from(clipboard.files || []);
  if (!files.length) {
    for (const item of Array.from(clipboard.items || [])) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  if (!files.length) return;
  event.preventDefault();
  if (props.isStreaming || isUploading.value) {
    uploadError.value = locale.value === "zh" ? "请等待当前上传或回复完成后再粘贴附件" : "Wait for the current upload or reply before pasting files";
    return;
  }
  // Preserve accompanying plain text at the caret, including selection replacement.
  const text = clipboard.getData("text/plain");
  if (text) {
    const textarea = event.currentTarget;
    textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, "end");
    input.value = textarea.value;
  }
  const imageExtensions = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
  const normalized = files.map((file, index) => {
    const extension = imageExtensions[file.type];
    if (!extension || /\.(png|jpe?g|webp)$/i.test(file.name)) return file;
    return new File([file], `pasted-image-${Date.now()}-${index + 1}.${extension}`, { type: file.type, lastModified: file.lastModified });
  });
  void addFiles(normalized);
}

async function addFiles(files) {
  if (!files.length) return;
  uploadError.value = "";
  emit("clear-error");
  if (props.isStreaming || isUploading.value) return;
  if (files.length + attachments.value.length > 4) { uploadError.value = "每条消息最多 4 个附件"; return; }
  for (const file of files) {
    if (!/\.(png|jpe?g|webp|pdf|md|txt|docx)$/i.test(file.name) || !file.size || file.size > 5 * 1024 * 1024) {
      uploadError.value = "请上传支持的非空文件，每个不超过 5 MB（旧版 .doc 请先另存为 .docx）";
      return;
    }
  }
  const pending = files.map(file => ({ name: file.name, size: file.size, localId: crypto.randomUUID(), status: "uploading", progress: 0, previewUrl: /^image\/(png|jpeg|webp)$/.test(file.type) ? URL.createObjectURL(file) : "" }));
  pending.forEach(item => { if (item.previewUrl) previewUrls.add(item.previewUrl); });
  attachments.value = [...attachments.value, ...pending];
  for (let index = 0; index < files.length; index++) {
    const item = pending[index];
    const update = (patch) => { attachments.value = attachments.value.map(value => value.localId === item.localId ? { ...value, ...patch } : value); };
    try {
      const result = await uploadAttachment(files[index], progress => update({ progress }));
      if (disposed) { void deleteAttachment(result.id).catch(() => {}); continue; }
      update({ ...result, status: "ready" });
      if (result.mimeType.startsWith("image/")) modelName.value = "qwen3-vl-plus";
    } catch (error) { update({ status: "error", error: error.message || "上传失败，请移除后重试" }); }
  }
}
async function removeFile(index) {
  const file = attachments.value[index];
  uploadError.value = "";
  emit("clear-error");
  try {
    if (file.id) await deleteAttachment(file.id);
    attachments.value = attachments.value.filter(item => item !== file);
  } catch (error) { uploadError.value = error.message || "移除失败，请重试"; }
}
watch(attachments, (files) => {
  const active = new Set(files.map(file => file.previewUrl));
  for (const url of previewUrls) if (!active.has(url)) { URL.revokeObjectURL(url); previewUrls.delete(url); }
});
onUnmounted(() => { disposed = true; previewUrls.forEach(URL.revokeObjectURL); });

function handleKeyDown(event) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!isUploading.value && !attachments.value.some(file => file.status === "error")) emit("send");
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
.attachment-list { display: flex; gap: 8px; flex-wrap: wrap; }
.attachment-card { display: flex; gap: 8px; align-items: center; min-width: 0; max-width: 100%; border: 1px solid #ffe1b6; border-radius: 10px; padding: 8px; }
.attachment-card img { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; }
.attachment-info { display: flex; flex-direction: column; min-width: 0; }
.attachment-info span { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.attachment-info small { font-size: 11px; color: #8a6a3d; overflow-wrap: anywhere; }
.attachment-card button { border: 0; background: transparent; cursor: pointer; padding: 4px; font-size: 20px; }
.attachment-error { color: #b42318; font-size: 13px; overflow-wrap: anywhere; }
.attachment-hint { max-width: 800px; margin: 8px auto 0; font-size: 11px; color: #8a6a3d; }
.attach-btn { flex-shrink: 0; width: 36px; height: 42px; border: 0; border-radius: 8px; color: #a26a2c; background: #fff5e8; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.attach-btn:disabled { opacity: .4; cursor: not-allowed; }

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
  min-width: 0;
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
