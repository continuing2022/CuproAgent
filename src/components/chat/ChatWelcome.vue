<template>
  <div class="welcome-screen">
    <div class="welcome-logo">CU</div>
    <h2>{{ t("welcome_title") }}</h2>
    <p>{{ t("welcome_desc") }}</p>
    <div class="suggestion-cards">
      <div class="suggestion-card" @click="emit('suggest', t('suggestion_1'))">
        <div class="card-icon">&#128172;</div>
        <div class="card-title">{{ t("suggestion_1") }}</div>
      </div>
      <div class="suggestion-card" @click="emit('suggest', t('suggestion_2'))">
        <div class="card-icon">&#10024;</div>
        <div class="card-title">{{ t("suggestion_2") }}</div>
      </div>
      <div class="suggestion-card" @click="emit('suggest', t('suggestion_3'))">
        <div class="card-icon">&#9997;</div>
        <div class="card-title">{{ t("suggestion_3") }}</div>
      </div>
      <div class="suggestion-card" @click="emit('suggest', t('suggestion_4'))">
        <div class="card-icon">&#128218;</div>
        <div class="card-title">{{ t("suggestion_4") }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { t } from "@/i18n";
const emit = defineEmits(["suggest"]);
</script>

<style lang="scss" scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.welcome-logo {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #ffb84d 0%, #ff8c00 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(255, 140, 0, 0.2);
}

.welcome-screen h2 {
  font-size: 28px;
  margin-bottom: 8px;
  color: #2d2d2d;
}

.welcome-screen > p {
  font-size: 16px;
  color: #666;
  margin-bottom: 40px;
}

.suggestion-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 600px;
  width: 100%;
}

.suggestion-card {
  padding: 20px;
  background: white;
  border: 2px solid rgba(255, 140, 0, 0.15);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-card:hover {
  border-color: #ffb84d;
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(255, 140, 0, 0.15);
}

.card-icon {
  font-size: 28px;
  margin-bottom: 12px;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #2d2d2d;
}
</style>
