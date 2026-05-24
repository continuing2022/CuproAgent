<template>
  <div class="auth-container">
    <div class="auth-background">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <div class="auth-content">
      <div class="brand-section">
        <div class="brand-logo">
          <div class="logo-circle">CU</div>
          <h1 class="brand-title">CuproAgent</h1>
        </div>
        <p class="brand-desc">{{ t("brand_desc") }}</p>

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

      <div class="form-section">
        <div class="form-card">
          <div class="form-header">
            <h2>{{ isLogin ? t("welcome_back") : t("create_account") }}</h2>
            <p>
              {{ isLogin ? t("login_continue_desc") : t("start_journey_desc") }}
            </p>
          </div>

          <el-form
            ref="formRef"
            class="auth-form auth-form-shell"
            :model="formData"
            :rules="formRules"
            :validate-on-rule-change="false"
            status-icon
            hide-required-asterisk
            @submit.prevent="handleSubmit"
          >
            <el-form-item
              v-if="!isLogin"
              prop="username"
              class="auth-form-item"
              :error="serverErrors.username"
            >
              <el-input
                v-model="formData.username"
                class="auth-input"
                :placeholder="t('placeholder_username')"
                maxlength="20"
                @input="clearServerError('username')"
                @blur="normalizeField('username')"
              >
                <template #prefix>
                  <User size="18" class="input-icon" />
                </template>
              </el-input>
            </el-form-item>

            <el-form-item
              prop="email"
              class="auth-form-item"
              :error="serverErrors.email"
            >
              <el-input
                v-model="formData.email"
                class="auth-input"
                type="email"
                :placeholder="t('placeholder_email')"
                @input="clearServerError('email')"
                @blur="normalizeField('email')"
              >
                <template #prefix>
                  <Mail size="18" class="input-icon" />
                </template>
              </el-input>
            </el-form-item>

            <el-form-item
              prop="password"
              class="auth-form-item"
              :error="serverErrors.password"
            >
              <el-input
                v-model="formData.password"
                class="auth-input"
                type="password"
                show-password
                :placeholder="t('placeholder_password')"
                @input="handlePasswordInput"
              >
                <template #prefix>
                  <Lock size="18" class="input-icon" />
                </template>
              </el-input>
            </el-form-item>

            <el-form-item
              v-if="!isLogin"
              prop="confirmPassword"
              class="auth-form-item"
              :error="serverErrors.confirmPassword"
            >
              <el-input
                v-model="formData.confirmPassword"
                class="auth-input"
                type="password"
                show-password
                :placeholder="t('placeholder_confirm_password')"
                @input="clearServerError('confirmPassword')"
              >
                <template #prefix>
                  <Lock size="18" class="input-icon" />
                </template>
              </el-input>
            </el-form-item>

            <div class="form-options" v-if="isLogin">
              <el-checkbox v-model="rememberMe">{{
                t("remember_me")
              }}</el-checkbox>
              <!-- <a href="#" class="forgot-link">{{ t("forgot_password") }}</a> -->
            </div>

            <el-button
              native-type="submit"
              class="submit-btn"
              :loading="isLoading"
              :disabled="isLoading"
            >
              <span>{{ isLogin ? t("login") : t("register") }}</span>
              <ArrowRight v-if="!isLoading" size="18" />
            </el-button>
          </el-form>

          <div class="switch-mode">
            {{ isLogin ? t("no_account") : t("has_account") }}
            <button type="button" class="switch-btn" @click="switchMode()">
              {{ isLogin ? t("register_now") : t("login_now") }}
            </button>
          </div>
        </div>

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
import { computed, nextTick, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Mail, Lock, User, ArrowRight } from "lucide-vue-next";
import { userLogin, userRegister } from "@/api";
import { t } from "@/i18n";
import router from "@/router";
import { setAuthSession } from "@/utils/authStorage";
import { setPendingFlashMessage } from "@/utils/flashMessage";
import {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
} from "@/utils/authValidation";

const formRef = ref(null);
const isLogin = ref(true);
const isLoading = ref(false);
const rememberMe = ref(true);

const formData = reactive({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const serverErrors = reactive({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const authMessageKeyMap = {
  "username required": ["err_enter_username", "请输入用户名"],
  "username must be 2-20 characters": [
    "username_length_2_20",
    "用户名长度需为 2 到 20 个字符",
  ],
  "email required": ["err_enter_email", "请输入邮箱"],
  "invalid email format": ["err_invalid_email", "请输入正确的邮箱格式"],
  "password required": ["err_enter_password", "请输入密码"],
  "password must be at least 6 characters": [
    "password_min_6",
    "密码长度不能少于 6 个字符",
  ],
  "invalid credentials": ["auth_invalid_credentials", "邮箱或密码错误"],
  "email already registered": ["auth_email_registered", "该邮箱已被注册"],
  "email already in use": ["auth_email_registered", "该邮箱已被注册"],
  "validation failed": ["auth_validation_failed", "请先修正表单中的错误"],
};

Object.assign(authMessageKeyMap, {
  "username required": ["err_enter_username", "请输入用户名"],
  "username must be 2-20 characters": [
    "username_length_2_20",
    "用户名长度需为 2 到 20 个字符",
  ],
  "email required": ["err_enter_email", "请输入邮箱"],
  "invalid email format": ["err_invalid_email", "请输入正确的邮箱格式"],
  "password required": ["err_enter_password", "请输入密码"],
  "password must be at least 6 characters": [
    "password_min_6",
    "密码长度不能少于 6 个字符",
  ],
  "invalid credentials": ["auth_invalid_credentials", "邮箱或密码错误"],
  "email already registered": ["auth_email_registered", "该邮箱已被注册"],
  "email already in use": ["auth_email_registered", "该邮箱已被注册"],
  "validation failed": ["auth_validation_failed", "请先修正表单中的错误"],
});

function mapAuthMessage(message) {
  if (!message) return t("request_error_retry");
  const mapped = authMessageKeyMap[message];
  return mapped ? t(mapped[0], mapped[1]) : message;
}

function clearServerError(field) {
  serverErrors[field] = "";
}

function clearAllServerErrors() {
  Object.keys(serverErrors).forEach((key) => {
    serverErrors[key] = "";
  });
}

function normalizeField(field) {
  if (field === "username") {
    formData.username = normalizeUsername(formData.username);
  }
  if (field === "email") {
    formData.email = normalizeEmail(formData.email);
  }
  clearServerError(field);
}

function handlePasswordInput() {
  clearServerError("password");
  clearServerError("confirmPassword");
}

function applyServerErrors(fieldErrors = {}) {
  clearAllServerErrors();
  Object.entries(fieldErrors).forEach(([field, message]) => {
    if (Object.prototype.hasOwnProperty.call(serverErrors, field)) {
      serverErrors[field] = mapAuthMessage(message);
    }
  });
}

const validateUsernameField = (_, value, callback) => {
  const normalizedValue = normalizeUsername(value);
  if (!normalizedValue) {
    callback(new Error(t("err_enter_username")));
    return;
  }
  if (!isValidUsername(normalizedValue)) {
    callback(new Error(t("username_length_2_20")));
    return;
  }
  callback();
};

const validateEmailField = (_, value, callback) => {
  const normalizedValue = normalizeEmail(value);
  if (!normalizedValue) {
    callback(new Error(t("err_enter_email")));
    return;
  }
  if (!isValidEmail(normalizedValue)) {
    callback(new Error(t("err_invalid_email")));
    return;
  }
  callback();
};

const validatePasswordField = (_, value, callback) => {
  if (!value) {
    callback(new Error(t("err_enter_password")));
    return;
  }
  if (!isValidPassword(value)) {
    callback(new Error(t("password_min_6")));
    return;
  }
  callback();
};

const validateConfirmPasswordField = (_, value, callback) => {
  if (isLogin.value) {
    callback();
    return;
  }
  if (!value) {
    callback(new Error(t("err_confirm_password")));
    return;
  }
  if (value !== formData.password) {
    callback(new Error(t("err_password_not_match")));
    return;
  }
  callback();
};

const formRules = computed(() => ({
  username: isLogin.value
    ? []
    : [{ validator: validateUsernameField, trigger: "blur" }],
  email: [{ validator: validateEmailField, trigger: "blur" }],
  password: [{ validator: validatePasswordField, trigger: "blur" }],
  confirmPassword: isLogin.value
    ? []
    : [{ validator: validateConfirmPasswordField, trigger: "blur" }],
}));

async function switchMode(nextMode = !isLogin.value, options = {}) {
  const { preserveEmail = false } = options;
  isLogin.value = nextMode;
  formData.username = "";
  formData.password = "";
  formData.confirmPassword = "";
  if (!preserveEmail) {
    formData.email = "";
  }
  clearAllServerErrors();
  await nextTick();
  formRef.value?.clearValidate();
}

async function handleSubmit() {
  if (!formRef.value || isLoading.value) return;

  formData.email = normalizeEmail(formData.email);
  if (!isLogin.value) {
    formData.username = normalizeUsername(formData.username);
  }

  clearAllServerErrors();

  const isValid = await formRef.value.validate().catch(() => false);
  if (!isValid) return;

  isLoading.value = true;

  try {
    if (isLogin.value) {
      const res = await userLogin({
        email: formData.email,
        password: formData.password,
        rememberMe: rememberMe.value,
      });

      setAuthSession({
        accessToken: res.token?.accessToken,
      });

      setPendingFlashMessage({
        type: "success",
        message: t("login_success"),
      });
      await router.push({ name: "Home" });
      return;
    }

    await userRegister({
      username: formData.username,
      email: formData.email,
      password: formData.password,
    });

    ElMessage.success(t("register_success", "注册成功，请登录"));
    await switchMode(true, { preserveEmail: true });
  } catch (err) {
    const fieldErrors = err?.fieldErrors || err?.errors;
    if (fieldErrors && typeof fieldErrors === "object") {
      applyServerErrors(fieldErrors);
      const firstField = Object.keys(fieldErrors)[0];
      await nextTick();
      formRef.value?.scrollToField?.(firstField);
      return;
    }

    ElMessage.warning(mapAuthMessage(err?.message || err?.error));
  } finally {
    isLoading.value = false;
  }
}
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
  background: #fff;
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

.auth-form-shell {
  width: 100%;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.auth-form-item {
  margin-bottom: 16px;
}

.input-icon {
  color: $text-muted-2;
}

:deep(.auth-form .el-form-item__content) {
  display: block;
}

:deep(.auth-form .el-form-item__error) {
  position: static;
  padding-top: 8px;
  font-size: 12px;
  color: $color-danger;
}

:deep(.auth-input .el-input__wrapper) {
  min-height: 52px;
  border-radius: 12px;
  background: #f8f8f8;
  box-shadow: 0 0 0 2px transparent inset;
  padding: 0 14px;
  transition: all 0.2s ease;
}

:deep(.auth-input .el-input__wrapper:hover) {
  background: #fff;
}

:deep(.auth-input .el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 2px $color-primary-2 inset;
}

:deep(.auth-form-item.is-error .el-input__wrapper) {
  background: #fff5f5;
  box-shadow: 0 0 0 2px $color-danger inset;
}

:deep(.auth-input .el-input__inner) {
  font-size: 15px;
  color: $text-dark;
}

:deep(.auth-input .el-input__inner::placeholder) {
  color: $text-muted-2;
}

:deep(.auth-input .el-input__prefix-inner) {
  color: $text-muted-2;
}

:deep(.auth-input .el-input__suffix-inner) {
  color: $text-muted-2;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: -4px 0 8px;
  font-size: 14px;
}

:deep(.form-options .el-checkbox) {
  color: #666;
}

:deep(.form-options .el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: $color-primary;
  border-color: $color-primary;
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
  width: 100%;
  height: 52px;
  margin-top: 8px;
  border: none;
  border-radius: 12px;
  background: $gradient-primary;
  color: $color-white;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 12px $shadow-primary;
  transition: all 0.3s ease;
}

:deep(.submit-btn.el-button) {
  background: $gradient-primary;
  color: $color-white;
}

:deep(.submit-btn.el-button:hover:not(.is-disabled)) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 140, 0, 0.4);
}

:deep(.submit-btn.is-loading),
:deep(.submit-btn.is-disabled) {
  opacity: 0.7;
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

  .form-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
