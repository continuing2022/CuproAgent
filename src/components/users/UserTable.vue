<template>
  <el-card class="table-card" shadow="never">
    <el-table
      :data="users"
      class="user-table"
      @selection-change="emit('selection-change', $event)"
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
            {{ row.role === "admin" ? t("admin") : t("normal_user") }}
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
              @click="emit('view', row)"
            >
              <el-icon>
                <View />
              </el-icon>
            </el-button>
            <el-button
              type="warning"
              size="small"
              circle
              @click="emit('edit', row)"
            >
              <el-icon>
                <Edit />
              </el-icon>
            </el-button>
            <el-button
              type="danger"
              size="small"
              circle
              @click="emit('delete', row)"
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

    <div class="table-footer">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="emit('page-change', $event)"
        @size-change="emit('page-size-change', $event)"
      />
    </div>
  </el-card>
</template>

<script setup>
import { View, Edit, Delete } from "@element-plus/icons-vue";
import { t } from "@/i18n";
import { formatDate } from "@/utils/date";

defineProps({
  users: { type: Array, required: true },
  total: { type: Number, required: true },
  currentPage: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  currentUserId: { type: [Number, String], required: true },
});
const emit = defineEmits([
  "selection-change",
  "view",
  "edit",
  "delete",
  "page-change",
  "page-size-change",
]);
</script>

<style scoped>
.table-card {
  border: 2px solid #ffe4d1;
  border-radius: 1rem;
  margin-bottom: 2rem;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

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

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.role-tag {
  font-weight: 600;
}

@media (max-width: 768px) {
  .table-footer {
    justify-content: center;
  }
}
</style>
