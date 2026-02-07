<template>
  <div class="profile-menu-container">
    <!-- 触发按钮 -->
    <div class="profile-trigger-wrapper">
      <button class="profile-trigger-btn" @click="isOpen = !isOpen">
        <div class="avatar-sm">{{ userProfile }}</div>
        <div class="user-info-sm">
          <div class="username-sm">{{ username }}</div>
          <div class="usertier-sm">{{ userTier }}</div>
        </div>
      </button>

      <!-- 下拉菜单 -->
      <transition
        enter-active-class="animate-in"
        leave-active-class="animate-out"
      >
        <div v-if="isOpen" class="dropdown-wrapper">
          <!-- 遮罩层 -->
          <div class="dropdown-mask" @click="isOpen = false" />

          <!-- 菜单内容 -->
          <div class="dropdown-content">
            <!-- 用户信息头部 -->
            <div class="dropdown-header">
              <div class="avatar-lg">{{ userProfile }}</div>
              <div class="user-info-lg">
                <div class="username-lg" :title="username">{{ username }}</div>
                <div class="userEmail-lg" :title="userEmail">
                  {{ userEmail }}
                </div>
              </div>
            </div>

            <!-- 菜单项 -->
            <div class="dropdown-menu">
              <!-- 个性化 -->
              <button class="menu-item">
                <User class="menu-icon" />
                <span class="menu-text">个性化</span>
              </button>
              <!-- 设置 -->
              <button class="menu-item">
                <Settings class="menu-icon" />
                <span class="menu-text">设置</span>
              </button>
              <!-- 帮助 -->
              <button class="menu-item menu-item-border">
                <HelpCircle class="menu-icon" />
                <span class="menu-text">帮助</span>
                <span class="menu-arrow">›</span>
              </button>
              <!-- 退出登录 -->
              <button class="menu-item menu-item-logout" @click="handleLogout">
                <LogOut class="menu-icon menu-icon-logout" />
                <span class="menu-text menu-text-logout">退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
// 导入Vue3响应式状态
import { ref } from "vue";
// 导入lucide-vue-next图标
import { User, Sparkles, Settings, HelpCircle, LogOut } from "lucide-vue-next";

// 控制下拉菜单显隐
const isOpen = ref(false);
// 用户信息常量
const username = ref(localStorage.getItem("username") || "用户");
const userEmail = ref(localStorage.getItem("email") || "@example.com");
const userProfile = ref(username.value.charAt(0).toUpperCase());
const userTier = "免费版";

// 退出登录方法
const handleLogout = () => {
  ElMessageBox.confirm("Are you sure you want to log out?", "Warning", {
    confirmButtonText: "OK",
    cancelButtonText: "Cancel",
    type: "warning",
    customClass: "logout-confirm-box",
  })
    .then(() => {
      localStorage.removeItem("username");
      localStorage.removeItem("token");
      localStorage.removeItem("email");
      // 刷新页面或重定向到登录页
      window.location.reload();
    })
    .catch(() => {});
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";
/* 根容器：居中+背景 */
.profile-menu-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  background-color: transparent;
  width: 100%;
}

/* 触发按钮外层：相对定位 */
.profile-trigger-wrapper {
  position: relative;
  width: 100%;
}

/* 触发按钮样式 */
.profile-trigger-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background-color: #f97316;
  color: #ffffff;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease;
  cursor: pointer;
  border: none;
  width: 100%;
}
.profile-trigger-btn:hover {
  background-color: #ea580c;
}

/* 小头像：触发按钮内 */
.avatar-sm {
  width: 2rem;
  height: 2rem;
  background-color: #facc15;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ea580c;
  font-weight: 700;
  font-size: 0.875rem;
}

/* 大头像：下拉菜单内 */
.avatar-lg {
  width: 3rem;
  height: 3rem;
  background-color: #facc15;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ea580c;
  font-weight: 700;
  font-size: 1.25rem;
}

/* 触发按钮内的用户小信息 */
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

/* 下拉菜单外层：包含遮罩和内容 */
.dropdown-wrapper {
  position: relative;
  z-index: 50;
}

/* 遮罩层：全屏透明遮罩 */
.dropdown-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  cursor: pointer;
}

/* 下拉菜单内容容器 */
.dropdown-content {
  position: absolute;
  left: -10px;
  top: -345px;
  width: 265px;
  background: linear-gradient(135deg, #ffffff 0%, #fff8f3 100%);
  border-radius: 0.75rem;
  box-shadow:
    0 25px 50px -12px rgba(255, 122, 31, 0.3),
    0 0 0 1px rgba(255, 140, 58, 0.1);
  overflow: hidden;
  border: 2px solid #ff8c3a;
  z-index: 50;
}

/* 下拉菜单头部：用户信息 */
.dropdown-header {
  padding: 1rem;
  border-bottom: 2px solid #ffe4d1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, #fff5ed 0%, #ffffff 100%);
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

/* 菜单项容器 */
.dropdown-menu {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  background: #ffffff;
}

/* 通用菜单项样式 */
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
  background: linear-gradient(90deg, #fff5ed 0%, #ffffff 100%);
  color: #ff7a1f;
  transform: translateX(4px);
}

.menu-item:hover::before {
  width: 4px;
}

/* 菜单项图标通用样式 */
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

/* 帮助菜单项：底部边框+右侧箭头 */
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

/* 退出登录按钮特殊样式 */
.menu-item.logout-item {
  color: #ef4444;
  margin-top: 0.5rem;
  border-top: 2px solid #ffe4d1;
}

.menu-item.logout-item .menu-icon {
  color: #ef4444;
}

.menu-item.logout-item:hover {
  background: linear-gradient(90deg, #fee2e2 0%, #ffffff 100%);
  color: #dc2626;
}

.menu-item.logout-item:hover .menu-icon {
  color: #dc2626;
}

.menu-item.logout-item:hover::before {
  background: linear-gradient(90deg, #ef4444 0%, transparent 100%);
}
</style>
