<template>
  <div class="user-management-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <el-icon :size="32">
            <User />
          </el-icon>
        </div>
        <div>
          <h1 class="page-title">{{ t("user_mgmt_title") }}</h1>
          <p class="page-subtitle">{{ t("user_mgmt_subtitle") }}</p>
        </div>
      </div>
      <div class="header-right">
        <el-button class="btn-back" @click="goBack">
          <el-icon class="btn-icon">
            <ArrowLeft />
          </el-icon>
          {{ t("back") }}
        </el-button>
        <el-button type="primary" class="btn-add" @click="handleAdd">
          <el-icon class="btn-icon">
            <Plus />
          </el-icon>
          {{ t("add_user") }}
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选区域 -->
    <el-card class="search-card" shadow="never">
      <div class="search-filter-section">
        <el-input
          v-model="searchQuery"
          :placeholder="t('search_user_email')"
          class="search-input"
          clearable
          @change="handleFiltersChange"
          @clear="handleFiltersChange"
        >
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>

        <div class="filter-group">
          <el-select
            v-model="filterRole"
            :placeholder="t('all_roles')"
            clearable
            class="filter-select"
            popper-class="model-select-popper user-role-select-popper"
            @change="handleFiltersChange"
          >
            <el-option :label="t('all_roles')" value="" />
            <el-option :label="t('admin')" value="admin" />
            <el-option :label="t('normal_user')" value="user" />
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <UserStats :stats="stats" />

    <!-- 用户列表表格 -->
    <UserTable
      :users="users"
      :total="total"
      :current-page="currentPage"
      :page-size="pageSize"
      :current-user-id="currentUserId"
      @selection-change="handleSelectionChange"
      @view="viewUser"
      @edit="editUser"
      @delete="deleteUser"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    />

    <!-- 批量操作栏 -->
    <transition name="slide-up">
      <el-card
        v-if="selectedUsers.length > 0"
        class="bulk-actions"
        shadow="always"
      >
        <div class="bulk-content">
          <div class="bulk-info">
            {{ t("selected_prefix") }}
            <strong>{{ selectedUsers.length }}</strong>
            {{ t("selected_suffix") }}
          </div>
          <div class="bulk-buttons">
            <el-button type="primary" @click="exportUsers">
              <el-icon class="btn-icon">
                <Download />
              </el-icon>
              {{ t("export") }}
            </el-button>
            <el-button type="danger" @click="bulkDelete">
              <el-icon class="btn-icon">
                <Delete />
              </el-icon>
              {{ t("bulk_delete") }}
            </el-button>
            <el-button @click="clearSelection">{{
              t("cancel_selection")
            }}</el-button>
          </div>
        </div>
      </el-card>
    </transition>

    <!-- 用户详情对话框（已提取为独立组件） -->
    <UserDetailDialog v-model="showUserDetail" :user="selectedUser" />

    <!-- 添加/编辑用户对话框 -->
    <UserFormDialog
      v-model="showUserForm"
      v-model:form="userForm"
      :is-editing="isEditing"
      @submit="submitUserForm"
    />
  </div>
</template>

<script setup>
import {
  User,
  ArrowLeft,
  Plus,
  Search,
  Delete,
  Download,
} from "@element-plus/icons-vue";
import { t } from "@/i18n";
import { useUserManagement } from "@/composables/useUserManagement";
import UserDetailDialog from "@/components/UserDetailDialog.vue";
import UserTable from "@/components/users/UserTable.vue";
import UserStats from "@/components/users/UserStats.vue";
import UserFormDialog from "@/components/users/UserFormDialog.vue";

const {
  searchQuery,
  filterRole,
  selectedUsers,
  currentPage,
  pageSize,
  showUserDetail,
  showUserForm,
  selectedUser,
  currentUserId,
  isEditing,
  userForm,
  users,
  total,
  stats,
  handleFiltersChange,
  handlePageChange,
  handlePageSizeChange,
  goBack,
  handleSelectionChange,
  clearSelection,
  handleAdd,
  editUser,
  submitUserForm,
  deleteUser,
  bulkDelete,
  exportUsers,
  viewUser,
} = useUserManagement();
</script>

<style scoped>
/* 容器样式 */
.user-management-container {
  padding: 2rem;
  /* 主题色变量（用于与左侧输入框保持一致的主色调） */
  --accent: #ff8c3a;
  --accent-2: #ff7a1f;
  --accent-light: #ffe4d1;
  --accent-shadow: rgba(255, 122, 31, 0.3);
  --accent-shadow-strong: rgba(255, 122, 31, 0.4);

  background: linear-gradient(135deg, #fff8f3 0%, #ffffff 100%);
  min-height: 100vh;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon {
  width: 3.5rem;
  height: 3.5rem;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px var(--accent-shadow);
  color: #ffffff;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--accent);
  margin: 0.25rem 0 0 0;
}

/* 搜索卡片 */
.search-card {
  margin-bottom: 2rem;
  border: 2px solid var(--accent-light);
  border-radius: 1rem;
}

.search-filter-section {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 300px;
}

.filter-group {
  display: flex;
  gap: 0.75rem;
}

.filter-select {
  width: 150px;
}

/* 统计卡片 */

/* 表格卡片 */

/* 用户信息 */

/* 操作按钮 */

/* 批量操作栏 */
.bulk-actions {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  width: auto;
  max-width: 90%;
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  border: 2px solid var(--accent);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.bulk-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  color: #ffffff;
}

.bulk-info {
  font-size: 0.875rem;
}

.bulk-info strong {
  color: var(--accent);
  font-weight: 700;
}

.bulk-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn-icon {
  margin-right: 0.5rem;
}

.btn-back {
  margin-right: 0.75rem;
  border: 2px solid var(--accent-light);
  background: transparent;
  color: var(--accent-2);
}

/* 过渡动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateX(-50%) translateY(100px);
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .user-management-container {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .search-filter-section {
    flex-direction: column;
  }

  .search-input {
    min-width: 100%;
  }

  .filter-group {
    flex-direction: column;
    width: 100%;
  }

  .filter-select {
    width: 100%;
  }

  .bulk-actions {
    width: 90%;
  }

  .bulk-content {
    flex-direction: column;
    gap: 1rem;
  }

  .bulk-buttons {
    width: 100%;
    flex-direction: column;
  }
}
</style>
