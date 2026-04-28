<template>
  <div class="auth-container">
    <!-- 背景渐变装饰层 -->
    <div class="auth-background">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <!-- 登录注册主体内容 -->
    <div class="auth-content">
      <!-- 左侧品牌介绍区 -->
      <div class="brand-section">
        <div class="brand-logo">
          <div class="logo-circle">CU</div>
          <h1 class="brand-title">CuproAgent</h1>
        </div>
        <p class="brand-desc">{{ t("brand_desc") }}</p>

        <!-- 功能亮点列表 -->
        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-icon">&#128172;</div>
            <div class="feature-text">
              <h3>{{ t("feature_chat_title") }}</h3>
              <p>{{ t("feature_chat_desc") }}</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">&#128274;</div>
            <div class="feature-text">
              <h3>{{ t("feature_privacy_title") }}</h3>
              <p>{{ t("feature_privacy_desc") }}</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">&#9889;</div>
            <div class="feature-text">
              <h3>{{ t("feature_speed_title") }}</h3>
              <p>{{ t("feature_speed_desc") }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单区：登录/注册切换 -->
      <div class="form-section">
        <div class="form-card">
          <div class="form-header">
            <h2>{{ isLogin ? t("welcome_back") : t("create_account") }}</h2>
            <p>
              {{ isLogin ? t("login_continue_desc") : t("start_journey_desc") }}
            </p>
          </div>

          <!-- 登录/注册表单 -->
          <form @submit="handleSubmit" class="auth-form">
            <!-- 用户名：仅注册显示 -->
            <div class="form-group" v-if="!isLogin">
              <div :class="['input-wrapper', { error: errors.username }]">
                <User size="18" class="input-icon" />
                <input
                  type="text"
                  name="username"
                  v-model="formData.username"
                  @input="handleInputChange"
                  :placeholder="t('placeholder_username')"
                />
              </div>
              <span class="error-text" v-if="errors.username">{{
                errors.username
              }}</span>
            </div>

            <!-- 邮箱 -->
            <div class="form-group">
              <div :class="['input-wrapper', { error: errors.email }]">
                <Mail size="18" class="input-icon" />
                <input
                  type="email"
                  name="email"
                  v-model="formData.email"
                  @input="handleInputChange"
                  :placeholder="t('placeholder_email')"
                />
              </div>
              <span class="error-text" v-if="errors.email">{{
                errors.email
              }}</span>
            </div>

            <!-- 密码 -->
            <div class="form-group">
              <div :class="['input-wrapper', { error: errors.password }]">
                <Lock size="18" class="input-icon" />
                <input
                  :type="showPassword ? 'text' : 'password'"
                  name="password"
                  v-model="formData.password"
                  @input="handleInputChange"
                  :placeholder="t('placeholder_password')"
                />
                <!-- 密码显隐切换 -->
                <button
                  type="button"
                  class="password-toggle"
                  @click="showPassword = !showPassword"
                >
                  <component :is="showPassword ? EyeOff : Eye" size="18" />
                </button>
              </div>
              <span class="error-text" v-if="errors.password">{{
                errors.password
              }}</span>
            </div>

            <!-- 确认密码：仅注册显示 -->
            <div class="form-group" v-if="!isLogin">
              <div
                :class="['input-wrapper', { error: errors.confirmPassword }]"
              >
                <Lock size="18" class="input-icon" />
                <input
                  :type="showPassword ? 'text' : 'password'"
                  name="confirmPassword"
                  v-model="formData.confirmPassword"
                  @input="handleInputChange"
                  :placeholder="t('placeholder_confirm_password')"
                />
              </div>
              <span class="error-text" v-if="errors.confirmPassword">{{
                errors.confirmPassword
              }}</span>
            </div>

            <!-- 记住我 + 忘记密码：仅登录显示 -->
            <div class="form-options" v-if="isLogin">
              <label class="remember-me">
                <input type="checkbox" />
                <span>{{ t("remember_me") }}</span>
              </label>
              <a href="#" class="forgot-link">{{ t("forgot_password") }}</a>
            </div>

            <!-- 提交按钮 -->
            <button type="submit" class="submit-btn" :disabled="isLoading">
              <template v-if="isLoading">
                <span class="loading-spinner"></span>
              </template>
              <template v-else>
                <span>{{ isLogin ? t("login") : t("register") }}</span>
                <ArrowRight size="18" />
              </template>
            </button>
          </form>

          <!-- 登录/注册模式切换 -->
          <div class="switch-mode">
            {{ isLogin ? t("no_account") : t("has_account") }}
            <button type="button" @click="switchMode" class="switch-btn">
              {{ isLogin ? t("register_now") : t("login_now") }}
            </button>
          </div>
        </div>

        <!-- 底部服务条款 -->
        <div class="form-footer">
          <p>{{ t("agree_terms_prefix") }}</p>
          <div class="footer-links">
            <a href="#">{{ t("terms_of_service") }}</a>
            <span>&middot;</span>
            <a href="#">{{ t("privacy_policy") }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import router from "@/router";
import { userLogin, userRegister } from "@/api";
import { ElMessage } from "element-plus";
import { t } from "@/i18n"; // 国际化翻译
import { setAuthSession } from "@/utils/authStorage"; // 存储登录态
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-vue-next";

// 控制当前是登录(true)还是注册(false)
const isLogin = ref(true);
// 控制密码明文/密文显示
const showPassword = ref(false);
// 控制加载状态（按钮禁用+loading动画）
const isLoading = ref(false);

// 表单数据对象
const formData = reactive({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
});

// 表单错误提示
const errors = reactive({});

// 邮箱格式验证
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// 表单整体验证
const validateForm = () => {
  const newErrors = {};

  // 注册时：用户名不能为空
  if (!isLogin.value && !formData.username.trim()) {
    newErrors.username = t("err_enter_username");
  }

  // 邮箱验证
  if (!formData.email.trim()) {
    newErrors.email = t("err_enter_email");
  } else if (!validateEmail(formData.email)) {
    newErrors.email = t("err_invalid_email");
  }

  // 密码验证（至少6位）
  if (!formData.password) {
    newErrors.password = t("err_enter_password");
  } else if (formData.password.length < 6) {
    newErrors.password = t("err_password_too_short");
  }

  // 注册时：确认密码验证
  if (!isLogin.value) {
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t("err_confirm_password");
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("err_password_not_match");
    }
  }

  // 更新错误对象
  Object.keys(errors).forEach((key) => delete errors[key]);
  Object.assign(errors, newErrors);

  // 无错误返回true
  return Object.keys(newErrors).length === 0;
};

// 表单提交：登录 / 注册
const handleSubmit = async (e) => {
  e.preventDefault();
  // 先验证表单，不通过则直接返回
  if (!validateForm()) return;

  isLoading.value = true;

  try {
    if (isLogin.value) {
      // 登录逻辑
      const payload = {
        email: formData.email,
        password: formData.password,
      };
      const res = await userLogin(payload);
      // 保存token和用户信息
      setAuthSession({
        accessToken: res.token?.accessToken,
        refreshToken: res.token?.refreshToken,
        user: res.user,
      });
      ElMessage.success(t("login_success"));
      // 登录成功跳转到首页
      router.push({ name: "Home" });
    } else {
      // 注册逻辑
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      };
      await userRegister(payload);
      // 注册成功后自动切换到登录
      isLogin.value = true;
    }
  } catch (err) {
    // 异常处理：显示后端错误或提示
    if (err && typeof err === "object") {
      if (err.errors) {
        Object.keys(errors).forEach((k) => delete errors[k]);
        Object.assign(errors, err.errors);
      } else if (err.message) {
        ElMessage.warning(err.message);
      } else {
        ElMessage.warning(t("request_error_retry"));
      }
    } else {
      ElMessage.warning(String(err));
    }
  } finally {
    // 无论成功失败，关闭loading
    isLoading.value = false;
  }
};

// 输入框变化时：同步数据 + 清除对应错误
const handleInputChange = (e) => {
  const { name, value } = e.target;
  formData[name] = value;
  if (errors[name]) {
    errors[name] = "";
  }
};

// 切换登录/注册模式：清空表单和错误
const switchMode = () => {
  isLogin.value = !isLogin.value;
  Object.keys(errors).forEach((key) => delete errors[key]);
  formData.username = "";
  formData.email = "";
  formData.password = "";
  formData.confirmPassword = "";
};
</script>
<style lang="scss" scoped>
@use "@/styles/index" as *;
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}

.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: $color-bg;
}

.auth-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: float 20s infinite ease-in-out;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: $gradient-primary;
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: $gradient-primary;
  bottom: -50px;
  right: -50px;
  animation-delay: 5s;
}

.orb-3 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, $color-accent, $color-primary-3);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: 10s;
}

@keyframes float {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  33% {
    transform: translate(30px, -30px) rotate(120deg);
  }
  66% {
    transform: translate(-20px, 20px) rotate(240deg);
  }
}

.auth-content {
  position: relative;
  z-index: 1;
  display: flex;
  max-width: 1200px;
  width: 100%;
  padding: 40px;
  gap: 60px;
  align-items: center;
}

.brand-section {
  flex: 1;
  color: #2d2d2d;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.logo-circle {
  width: 60px;
  height: 60px;
  background: $gradient-primary;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: $color-white;
  box-shadow: 0 8px 24px $shadow-primary;
}

.brand-title {
  font-size: 36px;
  font-weight: 700;
  background: $gradient-primary;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-desc {
  font-size: 18px;
  color: $text-muted;
  margin-bottom: 48px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.feature-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid $border-muted;
  transition: all 0.3s;
}

.feature-item:hover {
  transform: translateX(10px);
  border-color: $shadow-primary;
  box-shadow: 0 8px 24px $shadow-primary-weak;
}

.feature-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.feature-text h3 {
  font-size: 18px;
  margin-bottom: 4px;
  color: $text-dark;
}

.feature-text p {
  font-size: 14px;
  color: $text-muted;
}

.form-section {
  flex: 0 0 480px;
}

.form-card {
  background: white;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 140, 0, 0.1);
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #2d2d2d;
  margin-bottom: 8px;
}

.form-header p {
  font-size: 14px;
  color: #666;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8f8f8;
  border: 2px solid transparent;
  border-radius: 12px;
  transition: all 0.2s;
}

.input-wrapper:focus-within {
  background: white;
  border-color: $color-primary-2;
}

.input-wrapper.error {
  border-color: $color-danger;
  background: #fff5f5;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: $text-muted-2;
}

.input-wrapper input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: 14px 14px 14px 44px;
  font-size: 15px;
  color: $text-dark;
}

.input-wrapper input::placeholder {
  color: $text-muted-2;
}

.password-toggle {
  background: none;
  border: none;
  padding: 14px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: $color-primary;
}

.error-text {
  font-size: 12px;
  color: $color-danger;
  margin-top: -4px;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: -8px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
}

.remember-me input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.forgot-link {
  font-size: 14px;
  color: $color-primary;
  text-decoration: none;
  transition: color 0.2s;
}

.forgot-link:hover {
  color: $color-primary-2;
}

.submit-btn {
  margin-top: 8px;
  padding: 14px 24px;
  background: $gradient-primary;
  color: $color-white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
  box-shadow: 0 4px 12px $shadow-primary;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 140, 0, 0.4);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: $color-white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.switch-mode {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #666;
}

.switch-btn {
  background: none;
  border: none;
  color: $color-primary;
  font-weight: 600;
  cursor: pointer;
  margin-left: 4px;
  transition: color 0.2s;
}

.switch-btn:hover {
  color: $color-primary-2;
}

.form-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 12px;
  color: $text-muted-2;
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.footer-links a {
  color: $color-primary;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: $color-primary-2;
}

@media (max-width: 1024px) {
  .auth-content {
    flex-direction: column;
    gap: 40px;
  }

  .brand-section {
    text-align: center;
  }

  .feature-item {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .feature-item:hover {
    transform: translateY(-5px);
  }

  .form-section {
    flex: 0 0 auto;
    width: 100%;
    max-width: 480px;
  }
}

@media (max-width: 640px) {
  .auth-content {
    padding: 20px;
  }

  .form-card {
    padding: 28px 24px;
  }

  .brand-title {
    font-size: 28px;
  }

  .brand-desc {
    font-size: 16px;
  }

  .feature-list {
    gap: 16px;
  }
}
</style>
