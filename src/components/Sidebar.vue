<template>
  <aside class="sidebar" :class="{ open: sidebarOpen }">
    <div class="sidebar-header">
      <div class="brand">
        <div class="logo">CU</div>
        <span class="brand-name">CuproAgent</span>
      </div>
      <button class="close-sidebar" @click="setSidebarOpen(false)">
        <IconClose width="20" height="20" />
      </button>
    </div>

    <button class="new-chat-btn" @click="createNewConversation">
      <IconPlus width="18" height="18" />
      <span>{{ t("new_chat") }}</span>
    </button>

    <div class="conversations-list">
      <div class="list-section">
        <div class="section-title">{{ t("recent_chats") }}</div>
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: conv.id === currentConvId }"
          @click="setCurrentConvId(conv.id)"
        >
          <IconChat width="16" height="16" />
          <div class="conv-info">
            <div class="conv-title" :title="conv.title">{{ conv.title }}</div>
            <div class="conv-time">{{ formatTime(conv.timestamp) }}</div>
          </div>
          <div class="conversation-actions">
            <button
              class="action-btn"
              :title="t('rename_conversation')"
              @click.stop="handleRename(conv)"
            >
              <IconEdit width="14" height="14" />
            </button>
            <button
              v-if="conversations.length > 1"
              class="action-btn delete-btn"
              :title="t('delete_conversation')"
              @click.stop="handleDelete(conv)"
            >
              <IconTrash width="14" height="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <UserProfile />
    </div>
  </aside>
</template>

<script setup>
import { ElMessage, ElMessageBox } from "element-plus";
import UserProfile from "./userProfile.vue";
import { IconChat, IconClose, IconEdit, IconPlus, IconTrash } from "./icons";
import { t } from "@/i18n";

const props = defineProps({
  sidebarOpen: Boolean,
  conversations: {
    type: Array,
    default: () => [],
  },
  currentConvId: [Number, String],
  createNewConversation: Function,
  deleteConversation: Function,
  renameConversation: Function,
  setSidebarOpen: Function,
  setCurrentConvId: Function,
  formatTime: Function,
});

async function handleDelete(conversation) {
  try {
    await ElMessageBox.confirm(
      t("delete_conversation_confirm_message").replace(
        "{title}",
        conversation.title,
      ),
      t("delete_conversation_confirm_title"),
      {
        confirmButtonText: t("confirm_delete"),
        cancelButtonText: t("cancel"),
        type: "warning",
        customClass: "delete-confirm-box",
      },
    );

    await props.deleteConversation?.(conversation);
    ElMessage.success(t("conversation_deleted"));
  } catch (error) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(t("delete_conversation_failed"));
  }
}

async function handleRename(conversation) {
  try {
    const { value } = await ElMessageBox.prompt(
      t("rename_conversation_message"),
      {
        confirmButtonText: t("save"),
        cancelButtonText: t("cancel"),
        inputValue: conversation.title,
        inputPlaceholder: t("rename_conversation_placeholder"),
        customClass: "rename-conversation-box",
        inputValidator: (inputValue) => {
          const trimmed = String(inputValue || "").trim();
          if (!trimmed) return t("conversation_title_required");
          if (trimmed.length > 255) return t("conversation_title_too_long");
          return true;
        },
      },
    );

    const nextTitle = String(value || "").trim();
    if (!nextTitle || nextTitle === conversation.title) return;

    await props.renameConversation?.(conversation, nextTitle);
    ElMessage.success(t("conversation_renamed"));
  } catch (error) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(t("rename_conversation_failed"));
  }
}
</script>

<style lang="scss" scoped>
@use "@/styles/index" as *;

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
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.conversations-list::-webkit-scrollbar {
  display: none;
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

.conversation-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.conversation-item:hover .conversation-actions,
.conversation-item.active .conversation-actions {
  opacity: 0.9;
}

.action-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.delete-btn:hover {
  background: rgba(255, 255, 255, 0.24);
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}
</style>

