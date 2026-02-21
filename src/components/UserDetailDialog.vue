<template>
  <el-dialog
    v-model="visible"
    :title="t('user_detail')"
    width="600px"
    :close-on-click-modal="false"
    class="user-detail-dialog"
  >
    <div v-if="loading" class="loading">{{ t("loading") }}</div>

    <div v-else-if="userData" class="detail-content">
      <div class="detail-avatar-section">
        <div class="avatar-lg">{{ avatarLetter }}</div>
        <div class="detail-username">{{ userData.username }}</div>
        <div class="detail-email">{{ userData.email }}</div>
        <div class="detail-badges">
          <el-tag
            :type="userData.role === 'admin' ? 'danger' : 'primary'"
            class="role-tag"
          >
            {{ userData.role === "admin" ? t("admin") : t("normal_user") }}
          </el-tag>
        </div>
      </div>

      <el-divider />

      <div class="detail-info-section">
        <el-descriptions column="2" border>
          <el-descriptions-item :label="t('username')">{{
            userData.username
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('email')">{{
            userData.email
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('role')">{{
            userData.role
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('register_time')">{{
            formatDate(userData.createdAt || userData.created_at)
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('last_login')">{{
            formatDate(userData.lastLogin || userData.last_login)
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('login_count')">{{
            userData.loginCount || userData.login_count || "-"
          }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button class="close-btn" @click="visible = false">{{
          t("close")
        }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { getCurrentUser, getUserById } from "@/api";
import { t } from "@/i18n";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  user: { type: Object, default: null },
});
const emit = defineEmits(["update:modelValue"]);

const visible = ref(props.modelValue);
const loading = ref(false);
const userData = ref(props.user);

watch(
  () => props.modelValue,
  (v) => {
    visible.value = v;
  },
);
watch(visible, (v) => {
  emit("update:modelValue", v);
  if (v) loadUser();
});
watch(
  () => props.user,
  (v) => {
    userData.value = v;
  },
);

const avatarLetter = computed(() => {
  const name =
    (userData.value && (userData.value.username || userData.value.name)) || "";
  return name ? String(name).charAt(0).toUpperCase() : "";
});

const pad = (n) => String(n).padStart(2, "0");
const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

async function loadUser() {
  if (!visible.value) return;
  loading.value = true;
  try {
    if (props.user && props.user.id) {
      try {
        const detail = await getUserById(props.user.id);
        userData.value = detail || props.user;
      } catch {
        userData.value = props.user;
      }
    } else {
      const me = await getCurrentUser();
      userData.value = me || props.user;
    }
  } catch (e) {
    userData.value = props.user;
    console.error(e);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.detail-avatar-section {
  text-align: center;
  padding-bottom: 1rem;
}
.avatar-lg {
  width: 3rem;
  height: 3rem;
  background: #facc15;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  color: #ea580c;
  font-weight: 700;
  font-size: 1.25rem;
}
.detail-username {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0.75rem 0 0.25rem;
}
.detail-email {
  color: #6b7280;
  margin: 0;
}
.detail-badges {
  margin-top: 0.75rem;
}
.detail-info-section {
  margin-top: 1rem;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
.loading {
  padding: 2rem;
  text-align: center;
}
:deep(.close-btn) {
  background-color: #f97316;
  color: #ffffff;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease;
  cursor: pointer;
  border: none;
}
</style>
