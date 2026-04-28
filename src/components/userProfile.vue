<template>
  <div class="profile-menu-container">
    <div class="profile-trigger-wrapper">
      <button class="profile-trigger-btn" @click="isOpen = !isOpen">
        <div class="avatar-sm">{{ userProfile }}</div>
        <div class="user-info-sm">
          <div class="username-sm">{{ username }}</div>
          <div class="usertier-sm">{{ userTier }}</div>
        </div>
      </button>

      <transition enter-active-class="animate-in" leave-active-class="animate-out">
        <div v-if="isOpen" class="dropdown-wrapper">
          <div class="dropdown-mask" @click="isOpen = false" />

          <div class="dropdown-content">
            <div class="dropdown-header">
              <div class="avatar-lg">{{ userProfile }}</div>
              <div class="user-info-lg">
                <div class="username-lg" :title="username">{{ username }}</div>
                <div class="userEmail-lg" :title="userEmail">{{ userEmail }}</div>
              </div>
            </div>

            <div class="dropdown-menu">
              <div
                class="menu-item"
                style="justify-content: space-between; align-items: center"
              >
                <div style="display: flex; align-items: center; gap: 0.75rem">
                  <Settings class="menu-icon" />
                  <el-switch
                    class="language-switch"
                    v-model="isEnglish"
                    :active-text="t('lang_en_short')"
                    :inactive-text="t('lang_zh_short')"
                  />
                </div>
              </div>

              <button class="menu-item" @click="showUserDetail = true">
                <User class="menu-icon" />
                <span class="menu-text">{{ t("personal_info") }}</span>
              </button>

              <button class="menu-item menu-item-border" @click="onUserManage">
                <HelpCircle class="menu-icon" />
                <span class="menu-text">{{ t("backend_manage") }}</span>
                <span class="menu-arrow">&#8250;</span>
              </button>

              <button class="menu-item logout-item" @click="handleLogout">
                <LogOut class="menu-icon menu-icon-logout" />
                <span class="menu-text menu-text-logout">{{ t("logout") }}</span>
              </button>
            </div>
          </div>
        </div>
      </transition>

      <UserDetailDialog v-model="showUserDetail" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { User, Settings, HelpCircle, LogOut } from "lucide-vue-next";
import { ElMessage, ElMessageBox } from "element-plus";
import router from "@/router";
import UserDetailDialog from "@/components/UserDetailDialog.vue";
import { userLogout } from "@/api";
import { t, locale, setLocale } from "@/i18n";

const isOpen = ref(false);
const showUserDetail = ref(false);

const isEnglish = computed({
  get: () => locale.value === "en",
  set: (value) => {
    setLocale(value ? "en" : "zh");
    isOpen.value = false;
  },
});

const username = ref(localStorage.getItem("username") || t("default_user"));
const userEmail = ref(localStorage.getItem("email") || "user@example.com");
const userProfile = computed(() => username.value.charAt(0).toUpperCase());
const userTier = computed(() =>
  localStorage.getItem("role") === "admin" ? t("admin") : t("normal_user"),
);

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(t("confirm_logout"), t("warning"), {
      confirmButtonText: t("ok"),
      cancelButtonText: t("cancel"),
      type: "warning",
      customClass: "logout-confirm-box",
    });
    await userLogout();
    window.location.reload();
  } catch (_) {}
};

const onUserManage = async () => {
  try {
    await ElMessageBox.confirm(t("enter_admin"), t("warning"), {
      confirmButtonText: t("ok"),
      cancelButtonText: t("cancel"),
      type: "info",
      customClass: "logout-confirm-box",
    });

    const role = localStorage.getItem("role");
    if (role === "admin") {
      router.push({ name: "Usermanagement" });
    } else {
      ElMessage.error(t("no_permission"));
    }
  } catch (_) {}
};
</script>

<style lang="scss" scoped>
@use "@/styles/index" as *;

.profile-menu-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  background-color: transparent;
  width: 100%;
}

.profile-trigger-wrapper {
  position: relative;
  width: 100%;
}

.profile-trigger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background-color: #f97316;
  color: #fff;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease;
  cursor: pointer;
  border: none;
  width: 100%;
  font-size: 0.875rem;
}

.profile-trigger-btn:hover {
  background-color: #ea580c;
}

.avatar-sm,
.avatar-lg {
  background-color: #facc15;
  color: #ea580c;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.avatar-sm {
  width: 2rem;
  height: 2rem;
}

.avatar-lg {
  width: 3rem;
  height: 3rem;
  font-size: 1.25rem;
}

.user-info-sm {
  text-align: left;
}

.username-sm {
  font-weight: 500;
}

.usertier-sm {
  font-size: 0.75rem;
  color: #ffedd5;
}

.dropdown-wrapper {
  z-index: 50;
}

.dropdown-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  cursor: pointer;
}

.dropdown-content {
  position: absolute;
  left: -10px;
  top: -345px;
  width: 265px;
  background: linear-gradient(135deg, #fff 0%, #fff8f3 100%);
  border-radius: 0.75rem;
  box-shadow:
    0 10px 30px rgba(255, 140, 58, 0.25),
    0 0 0 1px rgba(255, 140, 58, 0.1);
  overflow: hidden;
  border: 2px solid #ff8c3a;
  z-index: 50;
}

.dropdown-header {
  padding: 1rem;
  border-bottom: 2px solid #ffe4d1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, #fff5ed 0%, #fff 100%);
}

.user-info-lg .username-lg {
  color: #1f2937;
  font-weight: 600;
  font-size: 1.125rem;
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-info-lg .userEmail-lg {
  color: #ff8c3a;
  font-size: 0.875rem;
  font-weight: 500;
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-menu {
  padding: 0.5rem 0;
  background: #fff;
}

.menu-item {
  width: 100%;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: transparent;
  border: none;
  color: #374151;
  text-align: left;
  transition: all 0.3s ease;
  cursor: pointer;
  font-weight: 500;
  position: relative;
}

.menu-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(90deg, #ff8c3a 0%, transparent 100%);
  transition: width 0.3s ease;
}

.menu-item:hover {
  background: linear-gradient(90deg, #fff5ed 0%, #fff 100%);
  color: #ff7a1f;
  transform: translateX(4px);
}

.menu-item:hover::before {
  width: 4px;
}

.menu-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #ff8c3a;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.menu-item:hover .menu-icon {
  color: #ff7a1f;
  transform: scale(1.1);
}

.language-switch {
  --el-switch-on-color: #ff8c3a;
  --el-switch-off-color: #ffd8bd;
}

.language-switch:deep(.el-switch__core) {
  border: 1px solid rgba(255, 140, 58, 0.45);
  box-shadow: inset 0 1px 3px rgba(255, 122, 31, 0.18);
}

.language-switch:deep(.el-switch__action) {
  border: 1px solid rgba(255, 140, 58, 0.2);
}

.language-switch:deep(.el-switch__label) {
  color: #b86932;
  font-weight: 500;
}

.language-switch:deep(.el-switch__label.is-active) {
  color: #ff7a1f;
}

.menu-item-border {
  border-bottom: 1px solid #ffe4d1;
}

.menu-arrow {
  margin-left: auto;
  color: #ff8c3a;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.menu-item:hover .menu-arrow {
  color: #ff7a1f;
  transform: translateX(4px);
}

.menu-item.logout-item {
  color: #ef4444;
  margin-top: 0.5rem;
  border-top: 2px solid #ffe4d1;
}

.menu-item.logout-item .menu-icon {
  color: #ef4444;
}

.menu-item.logout-item:hover {
  background: linear-gradient(90deg, #fee2e2 0%, #fff 100%);
  color: #dc2626;
}

.menu-item.logout-item:hover .menu-icon {
  color: #dc2626;
}

.menu-item.logout-item:hover::before {
  background: linear-gradient(90deg, #ef4444 0%, transparent 100%);
}
</style>
