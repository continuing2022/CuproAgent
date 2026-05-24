<template>
  <router-view />
  <transition name="route-loading-fade">
    <div v-if="isRouteLoading" class="route-loading-overlay" aria-live="polite">
      <div class="route-loading-card">
        <span class="route-loading-spinner" aria-hidden="true"></span>
        <span class="route-loading-text">{{ t("loading") }}</span>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { t } from "@/i18n";
import { isRouteLoading } from "@/utils/routeLoading";
</script>
<style lang="scss" scoped>
@use "@/styles/index" as *;
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.route-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 3600;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top, rgba(255, 189, 117, 0.16), transparent 40%),
    rgba(255, 251, 245, 0.68);
  backdrop-filter: blur(6px);
}

.route-loading-card {
  min-width: 164px;
  padding: 18px 24px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #8f531d;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 166, 77, 0.28);
  box-shadow:
    0 18px 38px rgba(238, 132, 18, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.route-loading-spinner {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid rgba(255, 166, 77, 0.22);
  border-top-color: #ff8c00;
  animation: route-loading-spin 0.8s linear infinite;
}

.route-loading-text {
  white-space: nowrap;
}

.route-loading-fade-enter-active,
.route-loading-fade-leave-active {
  transition: opacity 0.22s ease;
}

.route-loading-fade-enter-from,
.route-loading-fade-leave-to {
  opacity: 0;
}

@keyframes route-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<style lang="scss">
@use "@/styles/index" as *;
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>
