<template>
  <aside class="sidebar" :class="{ open: sidebarOpen }">
    <div class="sidebar-header">
      <div class="brand">
        <div class="logo">CU</div>
        <span class="brand-name">CuproAgent</span>
      </div>
      <button class="close-sidebar" @click="setSidebarOpen(false)">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <button class="new-chat-btn" @click="createNewConversation">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>新建对话</span>
    </button>

    <div class="conversations-list">
      <div class="list-section">
        <div class="section-title">最近对话</div>
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: conv.id === currentConvId }"
          @click="setCurrentConvId(conv.id)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            ></path>
          </svg>
          <div class="conv-info">
            <div class="conv-title">{{ conv.title }}</div>
            <div class="conv-time">{{ formatTime(conv.timestamp) }}</div>
          </div>
          <button
            v-if="conversations.length > 1"
            class="delete-btn"
            @click.stop="deleteConversation(conv.id)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="user-btn" @click="setShowUserModal(true)">
        <div class="user-avatar">C</div>
        <div class="user-info">
          <div class="user-name">continue 张</div>
          <div class="user-role">免费版</div>
        </div>
      </button>
    </div>
  </aside>
</template>

<script setup>
const props = defineProps({
  sidebarOpen: Boolean,
  conversations: Array,
  currentConvId: [Number, String],
  showUserModal: Boolean,
  createNewConversation: Function,
  deleteConversation: Function,
  setSidebarOpen: Function,
  setCurrentConvId: Function,
  setShowUserModal: Function,
  openSettings: Function,
  handleLogout: Function,
  formatTime: Function,
});

// 直接解构便于模板使用
const {
  sidebarOpen,
  conversations,
  currentConvId,
  showUserModal,
  createNewConversation,
  deleteConversation,
  setSidebarOpen,
  setCurrentConvId,
  setShowUserModal,
  openSettings,
  handleLogout,
  formatTime,
} = props;
</script>
<style scoped>
/* 侧边栏样式 */
.sidebar {
  width: 280px;
  background: linear-gradient(180deg, #ff8c00 0%, #ff7a00 100%);
  display: flex;
  flex-direction: column;
  color: white;
  transition: transform 0.3s ease;
  position: relative;
  z-index: 100;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 42px;
  height: 42px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  backdrop-filter: blur(10px);
}

.brand-name {
  font-size: 18px;
  font-weight: 600;
}

.close-sidebar {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.close-sidebar:hover {
  background: rgba(255, 255, 255, 0.1);
}

.new-chat-btn {
  margin: 0 16px 16px;
  padding: 12px 16px;
  background: white;
  color: #ff8c00;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.new-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}

.list-section {
  margin-bottom: 20px;
}

.section-title {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.conversation-item {
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}

.conversation-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.conversation-item.active {
  background: rgba(255, 255, 255, 0.2);
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-time {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 2px;
}

.delete-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  opacity: 0;
  transition: all 0.2s;
}

.conversation-item:hover .delete-btn {
  opacity: 0.7;
}

.delete-btn:hover {
  opacity: 1 !important;
  background: rgba(255, 255, 255, 0.2);
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.footer-btn {
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  transition: background 0.2s;
  margin-bottom: 6px;
}

.footer-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.version {
  text-align: center;
  font-size: 11px;
  opacity: 0.7;
  margin-top: 12px;
}
/* 用户按钮和弹窗 */
.user-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  color: white;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 8px;
}

.user-avatar,
.modal-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.user-info {
  text-align: left;
}
.user-name {
  font-size: 14px;
  font-weight: 600;
}
.user-role {
  font-size: 12px;
  opacity: 0.8;
}
</style>
