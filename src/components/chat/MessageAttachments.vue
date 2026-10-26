<template>
  <div class="message-attachments">
    <div v-for="file in files" :key="file.id" class="message-file">
      <img v-if="previews[file.id]" :src="previews[file.id]" :alt="file.name" />
      <button v-if="!file.mimeType.startsWith('image/')" type="button" :disabled="loading[file.id]" @click="download(file)">
        {{ file.name }} · {{ Math.ceil(file.size / 1024) }} KB ↓
      </button>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
<script setup>
import { onUnmounted, ref, watch } from "vue";
import { fetchAttachment } from "@/api/attachments";
const props = defineProps({ files: { type: Array, default: () => [] } });
const previews = ref({});
const loading = ref({});
const error = ref("");
let disposed = false;
watch(() => props.files, async (files) => {
  for (const file of files) {
    if (!file.mimeType.startsWith("image/") || previews.value[file.id]) continue;
    try {
      const blob = await fetchAttachment(file.id);
      if (!disposed) previews.value[file.id] = URL.createObjectURL(blob);
    } catch { if (!disposed) error.value = "图片预览加载失败，请刷新页面重试"; }
  }
}, { immediate: true });
async function download(file) {
  loading.value[file.id] = true;
  error.value = "";
  try {
    const url = URL.createObjectURL(await fetchAttachment(file.id));
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (failure) { error.value = failure.message || "附件下载失败"; }
  finally { loading.value[file.id] = false; }
}
onUnmounted(() => { disposed = true; Object.values(previews.value).forEach(URL.revokeObjectURL); });
</script>
<style scoped>
.message-attachments { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.message-file { min-width: 0; max-width: 100%; display: flex; flex-direction: column; gap: 4px; }
img { max-width: min(300px, 100%); max-height: 240px; object-fit: contain; border-radius: 8px; }
button { color: inherit; background: rgba(255,255,255,.2); border: 1px solid currentColor; border-radius: 8px; padding: 6px 10px; cursor: pointer; overflow-wrap: anywhere; text-align: left; }
</style>
