<template>
  <el-dialog v-model="visible" :title="zh ? '模型服务设置' : 'Model services'" width="min(560px, calc(100vw - 32px))" :close-on-click-modal="false" destroy-on-close @closed="clearDrafts">
    <p class="settings-note">{{ zh ? '填写你自己的 API Key，模型调用费用由对应服务商账户承担。密钥保存后仅显示尾号。' : 'Use your own API keys. Model usage is billed to your provider account. Only the last four characters are displayed after saving.' }}</p>
    <p v-if="error" class="settings-error" role="alert">{{ error }}</p>
    <div v-if="loading" role="status">{{ zh ? '正在加载…' : 'Loading…' }}</div>
    <template v-else>
      <form v-for="provider in providers" :key="provider.provider" class="provider-form" @submit.prevent="save(provider)">
        <div class="provider-heading">
          <label :for="`key-${provider.provider}`">{{ provider.provider === 'dashscope' ? (zh ? '阿里云百炼' : 'Alibaba Cloud Bailian') : 'DeepSeek' }}</label>
          <span>{{ provider.configured ? `${zh ? '已配置' : 'Configured'} ${provider.maskedKey}` : (zh ? '未配置' : 'Not configured') }}</span>
        </div>
        <el-input :id="`key-${provider.provider}`" v-model="drafts[provider.provider]" type="password" show-password autocomplete="new-password" :maxlength="512" :disabled="Boolean(busy) || !loaded" :placeholder="provider.configured ? (zh ? '输入新 Key 以更换' : 'Enter a new key to replace') : (zh ? '请输入 API Key' : 'Enter API key')" />
        <div class="provider-actions">
          <el-button native-type="submit" type="primary" :loading="busy === `save-${provider.provider}`" :disabled="Boolean(busy) || !loaded || !drafts[provider.provider]?.trim()">{{ zh ? '保存' : 'Save' }}</el-button>
          <el-button v-if="provider.configured" :loading="busy === `delete-${provider.provider}`" :disabled="Boolean(busy) || !loaded" @click="remove(provider)">{{ zh ? '删除' : 'Delete' }}</el-button>
        </div>
      </form>
      <el-button v-if="!loaded" @click="load">{{ zh ? '重新加载' : 'Retry' }}</el-button>
    </template>
    <p class="settings-note">{{ zh ? '百炼 Key 用于 Qwen、图片理解和知识库向量检索；DeepSeek Key 用于 DeepSeek 对话。摘要使用当前模型所属服务商。只配置 DeepSeek 时可正常聊天，知识库检索需另配百炼 Key。未配置或失效时不会使用平台公用 Key。' : 'Bailian powers Qwen, vision and knowledge retrieval. DeepSeek powers DeepSeek chat. Summaries use the selected provider. Knowledge retrieval also requires a Bailian key. Platform keys are never used as a fallback.' }}</p>
    <template #footer><el-button @click="visible = false">{{ zh ? '关闭' : 'Close' }}</el-button></template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { locale } from "@/i18n";
import { getModelSettings, saveModelKey, deleteModelKey } from "@/api/modelSettings";

const visible = defineModel({ type: Boolean, default: false });
const zh = computed(() => locale.value === "zh");
const providers = ref([]);
const drafts = ref({ dashscope: "", deepseek: "" });
const loading = ref(false);
const loaded = ref(false);
const busy = ref("");
const error = ref("");
function clearDrafts() { drafts.value = { dashscope: "", deepseek: "" }; }
async function load() {
  loading.value = true;
  loaded.value = false;
  error.value = "";
  try {
    providers.value = (await getModelSettings()).providers;
    loaded.value = true;
  } catch (e) { error.value = e.message || (zh.value ? "加载失败" : "Failed to load"); }
  finally { loading.value = false; }
}
async function save(provider) {
  busy.value = `save-${provider.provider}`;
  error.value = "";
  try {
    await saveModelKey(provider.provider, drafts.value[provider.provider].trim());
    drafts.value[provider.provider] = "";
    ElMessage.success(zh.value ? "已保存；下次调用将使用此 Key" : "Saved; the next request will use this key");
    await load();
  } catch (e) { error.value = e.message || (zh.value ? "保存失败" : "Failed to save"); }
  finally { busy.value = ""; }
}
async function remove(provider) {
  try {
    await ElMessageBox.confirm(zh.value ? "删除后，该服务商的模型需要重新配置 Key 才能使用。" : "You will need to add a key again to use this provider.", zh.value ? "删除 API Key" : "Delete API key", { confirmButtonText: zh.value ? "删除" : "Delete", cancelButtonText: zh.value ? "取消" : "Cancel", type: "warning" });
  } catch { return; }
  busy.value = `delete-${provider.provider}`;
  error.value = "";
  try {
    await deleteModelKey(provider.provider);
    drafts.value[provider.provider] = "";
    await load();
  } catch (e) { error.value = e.message || (zh.value ? "删除失败" : "Failed to delete"); }
  finally { busy.value = ""; }
}
watch(visible, open => { clearDrafts(); if (open) load(); });
</script>

<style scoped>
.settings-note { color: var(--color-muted, #666); font-size: 13px; line-height: 1.7; margin: 0 0 20px; }
.provider-form { padding: 18px 0; border-top: 1px solid var(--color-rule, #ddd); }
.provider-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.provider-heading label { font-weight: 600; color: var(--color-ink, #222); }
.provider-heading span { color: var(--color-muted, #666); font-size: 12px; }
.provider-actions { display: flex; gap: 8px; margin-top: 12px; }
.provider-actions :deep(.el-button + .el-button) { margin-left: 0; }
.settings-error { color: var(--color-error, #b42318); font-size: 13px; }
</style>
