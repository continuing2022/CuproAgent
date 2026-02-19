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
          <h1 class="page-title">用户管理</h1>
          <p class="page-subtitle">管理系统中的所有用户信息</p>
        </div>
      </div>
      <div class="header-right">
        <el-button class="btn-back" @click="goBack">
          <el-icon class="btn-icon">
            <ArrowLeft />
          </el-icon>
          返回
        </el-button>
        <el-button type="primary" class="btn-add" @click="handleAdd">
          <el-icon class="btn-icon">
            <Plus />
          </el-icon>
          添加用户
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选区域 -->
    <el-card class="search-card" shadow="never">
      <div class="search-filter-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名、邮箱..."
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
            placeholder="所有角色"
            clearable
            class="filter-select"
            @change="fetchUsers"
          >
            <el-option label="所有角色" value="" />
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>

          <el-button class="btn-reset" @click="resetFilters">
            <el-icon class="btn-icon">
              <Refresh />
            </el-icon>
            重置
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
            <p class="stat-label">总用户数</p>
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
            <p class="stat-label">管理员</p>
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
            <p class="stat-label">普通用户</p>
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

        <el-table-column label="用户信息" min-width="250">
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

        <el-table-column label="角色" width="180">
          <template #default="{ row }">
            <el-tag
              :type="row.role === 'admin' ? 'danger' : 'primary'"
              class="role-tag"
            >
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="登录次数" width="180">
          <template #default="{ row }">
            {{ row.loginCount }}
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="200">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="最后登录" width="200">
          <template #default="{ row }">
            {{ formatDate(row.lastLogin) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="240" fixed="right">
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
            已选择 <strong>{{ selectedUsers.length }}</strong> 个用户
          </div>
          <div class="bulk-buttons">
            <el-button type="primary" @click="exportUsers">
              <el-icon class="btn-icon">
                <Download />
              </el-icon>
              导出
            </el-button>
            <el-button type="danger" @click="bulkDelete">
              <el-icon class="btn-icon">
                <Delete />
              </el-icon>
              批量删除
            </el-button>
            <el-button @click="clearSelection">取消选择</el-button>
          </div>
        </div>
      </el-card>
    </transition>

    <!-- 用户详情对话框 -->
    <el-dialog
      v-model="showUserDetail"
      title="用户详情"
      width="600px"
      :close-on-click-modal="false"
      class="user-detail-dialog"
    >
      <div v-if="selectedUser" class="detail-content">
        <div class="detail-avatar-section">
          <el-avatar
            :size="80"
            :style="{ background: selectedUser.avatarColor }"
          >
            {{ selectedUser.username.charAt(0).toUpperCase() }}
          </el-avatar>
          <h3 class="detail-username">{{ selectedUser.username }}</h3>
          <p class="detail-email">{{ selectedUser.email }}</p>
          <div class="detail-badges">
            <el-tag
              :type="selectedUser.role === 'admin' ? 'danger' : 'primary'"
              size="large"
            >
              {{ getRoleText(selectedUser.role) }}
            </el-tag>
          </div>
        </div>

        <el-divider />

        <div class="detail-info-section">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="用户 ID">{{
              selectedUser.id
            }}</el-descriptions-item>
            <el-descriptions-item label="注册时间">{{
              formatDate(selectedUser.createdAt)
            }}</el-descriptions-item>
            <el-descriptions-item label="最后登录">{{
              formatDate(selectedUser.lastLogin)
            }}</el-descriptions-item>
            <el-descriptions-item label="登录次数"
              >{{ selectedUser.loginCount || 0 }} 次</el-descriptions-item
            >
          </el-descriptions>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showUserDetail = false">关闭</el-button>
          <el-button type="primary" @click="editUser(selectedUser)">
            <el-icon class="btn-icon">
              <Edit />
            </el-icon>
            编辑用户
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="showUserForm"
      :title="isEditing ? '编辑用户' : '添加用户'"
      width="500px"
      :close-on-click-modal="false"
      class="user-form-dialog"
    >
      <el-form
        :model="userForm"
        :rules="userFormRules"
        ref="userFormRef"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-radio-group v-model="userForm.role">
            <el-radio label="user">普通用户</el-radio>
            <el-radio label="admin">管理员</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="!isEditing" label="密码" prop="password">
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showUserForm = false">取消</el-button>
          <el-button type="primary" @click="submitUserForm">
            {{ isEditing ? "保存" : "添加" }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
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
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 2, max: 20, message: "长度在 2 到 20 个字符", trigger: "blur" },
  ],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱格式", trigger: "blur" },
  ],
  role: [{ required: true, message: "请选择角色", trigger: "change" }],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码长度不少于 6 个字符", trigger: "blur" },
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
    ElMessage.error(err.error || err.message || "获取用户列表失败");
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
  return role === "admin" ? "管理员" : "普通用户";
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
      ElMessage.success("用户信息已更新");
    } else {
      const payload = {
        username: userForm.value.username,
        email: userForm.value.email,
        role: userForm.value.role,
        password: userForm.value.password,
      };
      await createUser(payload);
      ElMessage.success("用户添加成功");
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
    ElMessage.error(err.error || err.message || "保存用户失败");
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
    ElMessage.warning("无法删除当前登录的管理员账户");
    return;
  }

  ElMessageBox.confirm(
    `确定要删除用户 "${user.username}" 吗？此操作不可恢复。`,
    "删除确认",
    {
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
      type: "warning",
      customClass: "delete-confirm-box",
    },
  )
    .then(async () => {
      try {
        await apiDeleteUser(user.id);
        ElMessage.success(`用户 "${user.username}" 已删除`);
        await fetchUsers();
        await fetchStats();
      } catch (err) {
        console.error(err);
        ElMessage.error(err.error || err.message || "删除用户失败");
      }
    })
    .catch(() => {});
};

const bulkDelete = () => {
  const count = selectedUsers.value.length;
  ElMessageBox.confirm(
    `确定要删除选中的 ${count} 个用户吗？此操作不可恢复。`,
    "批量删除确认",
    {
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
      type: "warning",
      customClass: "delete-confirm-box",
    },
  )
    .then(async () => {
      try {
        const selectedIds = selectedUsers.value.map((u) => u.id);
        await bulkDeleteUsers(selectedIds);
        ElMessage.success(`已删除 ${count} 个用户`);
        clearSelection();
        await fetchUsers();
        await fetchStats();
      } catch (err) {
        console.error(err);
        ElMessage.error(err.error || err.message || "批量删除失败");
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
        `导出 ${Array.isArray(data) ? data.length : 0} 条用户数据`,
      );
    } catch (err) {
      console.error(err);
      ElMessage.error(err.error || err.message || "导出失败");
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
    ElMessage.error(err.error || err.message || "获取用户详情失败");
  }
};

onMounted(async () => {
  await fetchCurrentUser();
  await fetchUsers();
  await fetchStats();
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

/* 确认框样式 */
:deep(.delete-confirm-box) {
  border-radius: 1rem;
  border: 2px solid var(--accent);
}

:deep(.delete-confirm-box .el-message-box__title) {
  color: var(--accent-2);
  font-weight: 600;
}

:deep(.delete-confirm-box .el-message-box__content) {
  color: #374151;
  padding: 1.5rem 0;
}

:deep(.delete-confirm-box .el-button--primary) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
}

:deep(.delete-confirm-box .el-button--primary:hover) {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
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
</style>
