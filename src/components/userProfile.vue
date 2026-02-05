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
      <div v-if="isOpen" class="dropdown-wrapper">
        <!-- 遮罩层 -->
        <div class="dropdown-mask" @click="isOpen = false" />

        <!-- 菜单内容 -->
        <div class="dropdown-content">
          <!-- 用户信息头部 -->
          <div class="dropdown-header">
            <div class="avatar-lg">{{ userProfile }}</div>
            <div class="user-info-lg">
              <div class="username-lg">{{ username }}</div>
              <div class="userEmail-lg">{{ userEmail }}</div>
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
  // 清除本地存储的用户信息
  localStorage.removeItem("username");
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  // 刷新页面或重定向到登录页
  window.location.reload();
};
</script>

<style scoped>
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
  background-color: #1f2937;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  border: 1px solid #374151;
  z-index: 50;
}

/* 下拉菜单头部：用户信息 */
.dropdown-header {
  padding: 1rem;
  border-bottom: 1px solid #374151;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.user-info-lg .username-lg {
  color: #ffffff;
  font-weight: 500;
  font-size: 1.125rem;
}
.user-info-lg .userEmail-lg {
  color: #9ca3af;
  font-size: 0.875rem;
}

/* 菜单项容器 */
.dropdown-menu {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
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
  color: #ffffff;
  text-align: left;
  transition: background-color 0.2s ease;
  cursor: pointer;
  font-weight: 500;
}
.menu-item:hover {
  background-color: #374151;
}
/* 菜单项图标通用样式 */
.menu-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #9ca3af;
  transition: color 0.2s ease;
}
.menu-item:hover .menu-icon {
  color: #fb923c;
}
/* 帮助菜单项：底部边框+右侧箭头 */
.menu-item-border {
  border-bottom: 1px solid #374151;
}
.menu-arrow {
  margin-left: auto;
  color: #6b7280;
}

/* 退出登录菜单项：hover红色 */
.menu-item-logout:hover .menu-icon-logout {
  color: #f87171;
}
.menu-text-logout {
  transition: color 0.2s ease;
}
.menu-item-logout:hover .menu-text-logout {
  color: #f87171;
}
</style>
