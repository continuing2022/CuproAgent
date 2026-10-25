import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
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
import { t } from "@/i18n";

export function useUserManagement() {
  const searchQuery = ref("");

  const filterRole = ref("");

  const selectedUsers = ref([]);

  const currentPage = ref(1);

  const pageSize = ref(10);

  const showUserDetail = ref(false);

  const showUserForm = ref(false);

  const selectedUser = ref(null);

  const currentUserId = ref(1);

  const isEditing = ref(false);

  const userForm = ref({
    username: "",
    email: "",
    role: "user",
    password: "",
  });

  const users = ref([]);

  const total = ref(0);

  const stats = ref({ total: 0, admins: 0, users: 0 });

  async function fetchStats() {
    try {
      const res = await getUsersStats();
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

  async function fetchUsers() {
    try {
      const params = {
        search: searchQuery.value || undefined,
        role: filterRole.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      };
      const res = await getUsers(params);
      users.value = (res.users || []).map((user) => ensureAvatarColor(user));
      total.value = res.total || users.value.length;
      currentPage.value = Number(res.page) || currentPage.value;
      pageSize.value = Number(res.pageSize) || pageSize.value;
    } catch (err) {
      console.error(err);
      ElMessage.error(err.error || err.message || t("get_user_list_failed"));
    }
  }

  async function handleFiltersChange() {
    currentPage.value = 1;
    await fetchUsers();
  }

  async function refreshUsers() {
    await fetchUsers();
    await fetchStats();
  }

  async function handlePageChange(page) {
    currentPage.value = page;
    await fetchUsers();
  }

  async function handlePageSizeChange(size) {
    pageSize.value = size;
    currentPage.value = 1;
    await fetchUsers();
  }

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
    try {
      const { id, username, email, role, password } = userForm.value;
      const payload = { username, email, role };
      if (isEditing.value) {
        await updateUser(id, payload);
        ElMessage.success(t("user_updated"));
      } else {
        await createUser({ ...payload, password });
        ElMessage.success(t("user_added"));
      }
      showUserForm.value = false;
      await refreshUsers();
    } catch (err) {
      if (err?.fieldErrors) {
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
          await refreshUsers();
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
          await refreshUsers();
        } catch (err) {
          console.error(err);
          ElMessage.error(err.error || err.message || t("bulk_delete_failed"));
        }
      })
      .catch(() => {});
  };

  const exportUsers = async () => {
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
  };

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
    await refreshUsers();
  });

  return {
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
  };
}
