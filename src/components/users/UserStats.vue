<template>
  <div class="stats-cards">
    <el-card
      v-for="card in cards"
      :key="card.field"
      class="stat-card"
      shadow="hover"
    >
      <div class="stat-content">
        <div class="stat-icon" :class="card.className">
          <el-icon :size="28"><component :is="card.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <p class="stat-label">{{ t(card.label) }}</p>
          <p class="stat-value">{{ stats[card.field] }}</p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { UserFilled, Management, Avatar } from "@element-plus/icons-vue";
import { t } from "@/i18n";
defineProps({ stats: { type: Object, required: true } });
const cards = [
  {
    field: "total",
    label: "total_users",
    className: "stat-icon-total",
    icon: UserFilled,
  },
  {
    field: "admins",
    label: "admin",
    className: "stat-icon-admin",
    icon: Management,
  },
  {
    field: "users",
    label: "normal_user",
    className: "stat-icon-user",
    icon: Avatar,
  },
];
</script>

<style scoped>
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

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
}
</style>
