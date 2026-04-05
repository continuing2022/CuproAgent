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
          @change="fetchUsers"
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
            @change="fetchUsers"
          >
            <el-option :label="t('all_roles')" value="" />
            <el-option :label="t('admin')" value="admin" />
            <el-option :label="t('normal_user')" value="user" />
          </el-select>

          <el-button class="btn-reset" @click="resetFilters">
            <el-icon class="btn-icon">
              <Refresh />
            </el-icon>
            {{ t("reset") }}
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon stat-icon-total">
            <el-icon :size="28">
              <UserFilled />
            </el-icon>
          </div>
          <div class="stat-info">
            <p class="stat-label">{{ t("total_users") }}</p>
            <p class="stat-value">{{ stats.total }}</p>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon stat-icon-admin">
            <el-icon :size="28">
              <Management />
            </el-icon>
          </div>
          <div class="stat-info">
            <p class="stat-label">{{ t("admin") }}</p>
            <p class="stat-value">{{ stats.admins }}</p>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon stat-icon-user">
            <el-icon :size="28">
              <Avatar />
            </el-icon>
          </div>
          <div class="stat-info">
            <p class="stat-label">{{ t("normal_user") }}</p>
            <p class="stat-value">{{ stats.users }}</p>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 用户列表表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="paginatedUsers"
        style="width: 100%"
        @selection-change="handleSelectionChange"
        :header-cell-style="{
          background: '#fff5ed',
          color: '#ff7a1f',
          fontWeight: 600,
        }"
      >
        <el-table-column type="selection" width="55" />

        <el-table-column :label="t('user_info')" min-width="250">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :size="40" :style="{ background: row.avatarColor }">
                {{ row.username.charAt(0).toUpperCase() }}
              </el-avatar>
              <div class="user-details">
                <p class="user-name">{{ row.username }}</p>
                <p class="user-email">{{ row.email }}</p>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('role')" width="180">
          <template #default="{ row }">
            <el-tag
              :type="row.role === 'admin' ? 'danger' : 'primary'"
              class="role-tag"
            >
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('login_count')" width="180">
          <template #default="{ row }">
            {{ row.loginCount }}
          </template>
        </el-table-column>
        <el-table-column :label="t('register_time')" width="200">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('last_login')" width="200">
          <template #default="{ row }">
            {{ formatDate(row.lastLogin) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('actions')" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                type="primary"
                size="small"
                circle
                @click="viewUser(row)"
              >
                <el-icon>
                  <View />
                </el-icon>
              </el-button>
              <el-button
                type="warning"
                size="small"
                circle
                @click="editUser(row)"
              >
                <el-icon>
                  <Edit />
                </el-icon>
              </el-button>
              <el-button
                type="danger"
                size="small"
                circle
                @click="deleteUser(row)"
                :disabled="row.role === 'admin' && row.id === currentUserId"
              >
                <el-icon>
                  <Delete />
                </el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

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
    <el-dialog
      v-model="showUserForm"
      :title="isEditing ? t('edit_user') : t('add_user')"
      :width="formDialogWidth"
      :close-on-click-modal="false"
      class="user-form-dialog"
    >
      <el-form
        :model="userForm"
        :rules="userFormRules"
        ref="userFormRef"
        :label-width="formLabelWidth"
        :label-position="formLabelPosition"
      >
        <el-form-item :label="t('username')" prop="username">
          <el-input
            v-model="userForm.username"
            :placeholder="t('enter_username')"
          />
        </el-form-item>

        <el-form-item :label="t('email')" prop="email">
          <el-input v-model="userForm.email" :placeholder="t('enter_email')" />
        </el-form-item>

        <el-form-item :label="t('role')" prop="role">
          <el-radio-group v-model="userForm.role">
            <el-radio label="user">{{ t("normal_user") }}</el-radio>
            <el-radio label="admin">{{ t("admin") }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="!isEditing" :label="t('password')" prop="password">
          <el-input
            v-model="userForm.password"
            type="password"
            :placeholder="t('enter_password')"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showUserForm = false">{{ t("cancel") }}</el-button>
          <el-button type="primary" @click="submitUserForm">
            {{ isEditing ? t("save") : t("add") }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  User,
  ArrowLeft,
  Plus,
  Search,
  Refresh,
  UserFilled,
  Management,
  Avatar,
  View,
  Edit,
  Delete,
  Download,
} from "@element-plus/icons-vue";
import {
  getUsers,
  getUsersStats,
  getUserById,
  createUser,
  updateUser,
  deleteUser as apiDeleteUser,
  bulkDeleteUsers,
  exportUsers as apiExportUsers,
  getCurrentUser,
} from "@/api";
import UserDetailDialog from "@/components/UserDetailDialog.vue";
import { t } from "@/i18n";

// 数据状态
const searchQuery = ref("");
const filterRole = ref("");
const selectedUsers = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const showUserDetail = ref(false);
const showUserForm = ref(false);
const selectedUser = ref(null);
const currentUserId = ref(1); // 当前登录用户ID
const isEditing = ref(false);
const userFormRef = ref(null);

// 表单对话框响应式设置
const formDialogWidth = ref("500px");
const formLabelWidth = ref("100px");
const formLabelPosition = ref("right");

function updateFormDialogWidth() {
  try {
    const w = window.innerWidth;
    if (w <= 480) {
      formDialogWidth.value = "95%";
      formLabelPosition.value = "top";
      formLabelWidth.value = "100%";
    } else if (w <= 640) {
      formDialogWidth.value = "90%";
      formLabelPosition.value = "top";
      formLabelWidth.value = "100px";
    } else {
      formDialogWidth.value = "500px";
      formLabelPosition.value = "right";
      formLabelWidth.value = "100px";
    }
  } catch (e) {
    formDialogWidth.value = "500px";
    formLabelPosition.value = "right";
    formLabelWidth.value = "100px";
  }
}

// 用户表单数据
const userForm = ref({
  username: "",
  email: "",
  role: "user",
  password: "",
});

// 表单验证规则
const userFormRules = {
  username: [
    { required: true, message: t("enter_username"), trigger: "blur" },
    { min: 2, max: 20, message: t("username_length_2_20"), trigger: "blur" },
  ],
  email: [
    { required: true, message: t("enter_email"), trigger: "blur" },
    { type: "email", message: t("invalid_email_format"), trigger: "blur" },
  ],
  role: [{ required: true, message: t("choose_role"), trigger: "change" }],
  password: [
    { required: true, message: t("enter_password"), trigger: "blur" },
    { min: 6, message: t("password_min_6"), trigger: "blur" },
  ],
};

// 用户数据（来自后端）
const users = ref([]);
const total = ref(0);

// 统计数据
const stats = ref({ total: 0, admins: 0, users: 0 });

async function fetchStats() {
  try {
    const res = await getUsersStats();
    // 后端返回格式假定为 { total, admin, user }
    stats.value = res;
  } catch (err) {
    console.error(err);
  }
}

async function fetchCurrentUser() {
  try {
    const me = await getCurrentUser();
    if (me && me.id) currentUserId.value = me.id;
  } catch (err) {
    console.error(err);
  }
}

// 分页后的用户列表（后端已分页，直接使用 users）
const paginatedUsers = computed(() => users.value);

// 从后端获取用户列表
async function fetchUsers() {
  try {
    const params = {
      search: searchQuery.value || undefined,
      role: filterRole.value || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
    };
    const res = await getUsers(params);
    // 假定后端返回 { users: [...], total, page, pageSize }
    users.value = (res.users || []).map((user) => ensureAvatarColor(user));
    total.value = res.total || users.value.length;
  } catch (err) {
    console.error(err);
    ElMessage.error(err.error || err.message || t("get_user_list_failed"));
  }
}

// 方法
const resetFilters = () => {
  searchQuery.value = "";
  filterRole.value = "";
  currentPage.value = 1;
  void fetchUsers();
};

const router = useRouter();
const goBack = () => {
  // 使用 router.back() 返回上一页，若无历史则退到首页
  if (window.history.length > 1) router.back();
  else router.push({ path: "/" });
};

const handleSelectionChange = (selection) => {
  selectedUsers.value = selection;
};

const clearSelection = () => {
  selectedUsers.value = [];
};

const getRoleText = (role) => {
  return role === "admin" ? t("admin") : t("normal_user");
};

const handleAdd = () => {
  isEditing.value = false;
  userForm.value = {
    username: "",
    email: "",
    role: "user",
    password: "",
  };
  showUserForm.value = true;
};

const editUser = (user) => {
  isEditing.value = true;
  userForm.value = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    password: "",
  };
  showUserDetail.value = false;
  showUserForm.value = true;
};

const submitUserForm = async () => {
  if (!userFormRef.value) return;
  try {
    await userFormRef.value.validate();
    if (isEditing.value) {
      const payload = {
        username: userForm.value.username,
        email: userForm.value.email,
        role: userForm.value.role,
      };
      await updateUser(userForm.value.id, payload);
      ElMessage.success(t("user_updated"));
    } else {
      const payload = {
        username: userForm.value.username,
        email: userForm.value.email,
        role: userForm.value.role,
        password: userForm.value.password,
      };
      await createUser(payload);
      ElMessage.success(t("user_added"));
    }
    showUserForm.value = false;
    await fetchUsers();
    await fetchStats();
  } catch (err) {
    // 验证失败或保存失败
    if (err && err.errors) {
      // 表单验证错误，Element Plus 会在表单项显示错误提示，这里无需重复显示
      return;
    }
    console.error(err);
    ElMessage.error(err.error || err.message || t("save_user_failed"));
  }
};

const getRandomColor = () => {
  const colors = [
    "#ff8c3a",
    "#3b82f6",
    "#10b981",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const ensureAvatarColor = (user) => {
  if (!user || user.avatarColor) return user;
  return { ...user, avatarColor: getRandomColor() };
};

const pad = (n) => String(n).padStart(2, "0");
const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const deleteUser = (user) => {
  if (user.role === "admin" && user.id === currentUserId.value) {
    ElMessage.warning(t("cannot_delete_current_admin"));
    return;
  }

  ElMessageBox.confirm(
    `${t("confirm_delete_user_prefix")} "${user.username}" ${t("confirm_delete_user_suffix")}`,
    t("delete_confirm"),
    {
      confirmButtonText: t("confirm_delete"),
      cancelButtonText: t("cancel"),
      type: "warning",
      customClass: "delete-confirm-box",
    },
  )
    .then(async () => {
      try {
        await apiDeleteUser(user.id);
        ElMessage.success(
          `${t("user_deleted_prefix")} "${user.username}" ${t("user_deleted_suffix")}`,
        );
        await fetchUsers();
        await fetchStats();
      } catch (err) {
        console.error(err);
        ElMessage.error(err.error || err.message || t("delete_user_failed"));
      }
    })
    .catch(() => {});
};

const bulkDelete = () => {
  const count = selectedUsers.value.length;
  ElMessageBox.confirm(
    `${t("confirm_delete_selected_prefix")} ${count} ${t("confirm_delete_selected_suffix")}`,
    t("bulk_delete_confirm"),
    {
      confirmButtonText: t("confirm_delete"),
      cancelButtonText: t("cancel"),
      type: "warning",
      customClass: "delete-confirm-box",
    },
  )
    .then(async () => {
      try {
        const selectedIds = selectedUsers.value.map((u) => u.id);
        await bulkDeleteUsers(selectedIds);
        ElMessage.success(
          `${t("deleted_count_prefix")} ${count} ${t("deleted_count_suffix")}`,
        );
        clearSelection();
        await fetchUsers();
        await fetchStats();
      } catch (err) {
        console.error(err);
        ElMessage.error(err.error || err.message || t("bulk_delete_failed"));
      }
    })
    .catch(() => {});
};

const exportUsers = () => {
  (async () => {
    try {
      const userIds = selectedUsers.value.map((u) => u.id);
      const res = await apiExportUsers(userIds.length ? { userIds } : {});
      // 后端返回 data 数组
      const data = res.data || res;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users_export_${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      ElMessage.success(
        `${t("exported_prefix")} ${Array.isArray(data) ? data.length : 0} ${t("exported_suffix")}`,
      );
    } catch (err) {
      console.error(err);
      ElMessage.error(err.error || err.message || t("export_failed"));
    }
  })();
};

// 查看单个用户（从后端获取详细信息）
const viewUser = async (user) => {
  try {
    const detail = await getUserById(user.id);
    selectedUser.value = ensureAvatarColor(detail);
    showUserDetail.value = true;
  } catch (err) {
    console.error(err);
    ElMessage.error(err.error || err.message || t("get_user_detail_failed"));
  }
};

onMounted(async () => {
  await fetchCurrentUser();
  await fetchUsers();
  await fetchStats();
  updateFormDialogWidth();
  window.addEventListener("resize", updateFormDialogWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateFormDialogWidth);
});
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
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  border: 2px solid var(--accent-light);
  border-radius: 1rem;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px var(--accent-shadow);
  border-color: var(--accent);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.stat-icon-total {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
}

.stat-icon-admin {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.stat-icon-user {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0.25rem 0 0 0;
}

/* 表格卡片 */
.table-card {
  border: 2px solid #ffe4d1;
  border-radius: 1rem;
  margin-bottom: 2rem;
}

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-details {
  flex: 1;
}

.user-name {
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  font-size: 0.875rem;
}

.user-email {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0.125rem 0 0 0;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 0.5rem;
}

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

/* 用户详情对话框 */
.detail-content {
  padding: 1rem 0;
}

.detail-avatar-section {
  text-align: center;
  padding-bottom: 1.5rem;
}

.detail-username {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 1rem 0 0.5rem 0;
}

.detail-email {
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 1rem 0;
}

.detail-badges {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.detail-info-section {
  margin-top: 1.5rem;
}

/* 对话框底部 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
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

/* Element Plus 组件自定义样式 */
:deep(.el-button--primary) {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  border: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px var(--accent-shadow);
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, var(--accent-2) 0%, #ff6a0f 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--accent-shadow-strong);
}

:deep(.el-button--warning) {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
}

:deep(.el-button--warning:hover) {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
}

:deep(.el-button--danger) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: none;
}

:deep(.el-button--danger:hover) {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}

:deep(.el-input__wrapper) {
  border: 2px solid var(--accent-light);
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  border-color: var(--accent);
}

:deep(.el-input__wrapper.is-focus) {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(255, 140, 58, 0.1);
}

:deep(.el-select .el-input__wrapper) {
  border: 2px solid #ffe4d1;
}

:deep(.el-pagination.is-background .el-pager li:not(.is-disabled).is-active) {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  color: #ffffff;
}

:deep(.el-pagination.is-background .el-pager li:not(.is-disabled):hover) {
  color: var(--accent-2);
}

:deep(.el-tag--primary) {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
  border: none;
}

:deep(.el-tag--danger) {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
  border: none;
}

.role-tag {
  font-weight: 600;
}

:deep(.el-card) {
  border: 2px solid var(--accent-light);
}

:deep(.el-dialog) {
  border-radius: 1rem;
  border: 2px solid var(--accent);
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #fff5ed 0%, #ffffff 100%);
  border-bottom: 2px solid var(--accent-light);
  border-radius: 1rem 1rem 0 0;
}

:deep(.el-dialog__title) {
  color: var(--accent-2);
  font-weight: 700;
  font-size: 1.25rem;
}

:deep(.el-descriptions__label) {
  color: #6b7280;
  font-weight: 600;
}

:deep(.el-descriptions__content) {
  color: #1f2937;
  font-weight: 500;
}

:deep(.btn-reset:hover) {
  background: transparent;
  border: 2px solid var(--accent-light);
  color: var(--accent-2);
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

  .stats-cards {
    grid-template-columns: 1fr;
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

/* 优化添加/编辑对话框的移动端展示 */
:deep(.user-form-dialog) {
  border-radius: 1rem;
}

@media (max-width: 640px) {
  :deep(.user-form-dialog) {
    max-width: 95% !important;
    margin: 1rem !important;
  }
  :deep(.user-form-dialog .el-form--label-top .el-form-item__label) {
    padding-bottom: 0.5rem;
  }
  :deep(.user-form-dialog .el-form-item__content) {
    padding-left: 0;
  }
  :deep(.user-form-dialog .el-form-item) {
    margin-bottom: 0.75rem;
  }
  :deep(.user-form-dialog .dialog-footer .el-button) {
    padding: 6px 12px;
  }
}
</style>
