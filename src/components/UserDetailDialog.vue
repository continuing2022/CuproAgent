<template>
  <el-dialog
    v-model="visible"
    :title="t('user_detail')"
    :width="dialogWidth"
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
        <el-descriptions :column="descColumn" border>
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
import { formatDate } from "@/utils/date";
import { useViewportWidth } from "@/composables/useViewportWidth";

const props = defineProps({
  user: { type: Object, default: null },
});

const visible = defineModel({ type: Boolean, default: false });
const loading = ref(false);
const userData = ref(props.user);

watch(visible, (v) => {
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

const viewportWidth = useViewportWidth();
const dialogWidth = computed(() =>
  viewportWidth.value <= 640 ? "95%" : "600px",
);
const descColumn = computed(() => (viewportWidth.value <= 640 ? 1 : 2));

async function loadUser() {
  loading.value = true;
  try {
    const detail = props.user?.id
      ? await getUserById(props.user.id)
      : await getCurrentUser();
    userData.value = detail || props.user;
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
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
.loading {
  padding: 2rem;
  text-align: center;
}
/* 媒体查询 */
@media (max-width: 640px) {
  .avatar-lg {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1rem;
  }
  .detail-username {
    font-size: 1rem;
    margin-top: 0.5rem;
  }
}
</style>
