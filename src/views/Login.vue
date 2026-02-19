<template>
  <div class="auth-container">
    <div class="auth-background">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>
    <div class="auth-content">
      <!-- 左侧品牌区域 -->
      <div class="brand-section">
        <div class="brand-logo">
          <div class="logo-circle">CU</div>
          <h1 class="brand-title">CuproAgent</h1>
        </div>
        <p class="brand-desc">智能助手 · 私有化部署友好</p>
        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-icon">🤖</div>
            <div class="feature-text">
              <h3>智能对话</h3>
              <p>自然流畅的AI交互体验</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🔒</div>
            <div class="feature-text">
              <h3>隐私安全</h3>
              <p>企业级数据加密保护</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">⚡</div>
            <div class="feature-text">
              <h3>极速推理</h3>
              <p>Agent智能问答实时解析</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单区域 -->
      <div class="form-section">
        <div class="form-card">
          <div class="form-header">
            <h2>{{ isLogin ? "欢迎回来" : "创建账号" }}</h2>
            <p>
              {{ isLogin ? "登录继续使用 CuproAgent" : "开始您的智能助手之旅" }}
            </p>
          </div>

          <form @submit="handleSubmit" class="auth-form">
            <!-- 注册时显示用户名输入框 -->
            <div class="form-group" v-if="!isLogin">
              <div :class="['input-wrapper', { error: errors.username }]">
                <User size="18" class="input-icon" />
                <input
                  type="text"
                  name="username"
                  v-model="formData.username"
                  @input="handleInputChange"
                  placeholder="请输入用户名"
                />
              </div>
              <span class="error-text" v-if="errors.username">{{
                errors.username
              }}</span>
            </div>
            <div class="form-group">
              <div :class="['input-wrapper', { error: errors.email }]">
                <Mail size="18" class="input-icon" />
                <input
                  type="email"
                  name="email"
                  v-model="formData.email"
                  @input="handleInputChange"
                  placeholder="请输入邮箱地址"
                />
              </div>
              <span class="error-text" v-if="errors.email">{{
                errors.email
              }}</span>
            </div>
            <div class="form-group">
              <div :class="['input-wrapper', { error: errors.password }]">
                <Lock size="18" class="input-icon" />
                <input
                  :type="showPassword ? 'text' : 'password'"
                  name="password"
                  v-model="formData.password"
                  @input="handleInputChange"
                  placeholder="请输入密码"
                />
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
            <!-- 注册时显示确认密码 -->
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
                  placeholder="请再次输入密码"
                />
              </div>
              <span class="error-text" v-if="errors.confirmPassword">{{
                errors.confirmPassword
              }}</span>
            </div>
            <!-- 登录时显示记住我和忘记密码 -->
            <div class="form-options" v-if="isLogin">
              <label class="remember-me">
                <input type="checkbox" />
                <span>记住我</span>
              </label>
              <a href="#" class="forgot-link">忘记密码？</a>
            </div>
            <button type="submit" class="submit-btn" :disabled="isLoading">
              <template v-if="isLoading">
                <span class="loading-spinner"></span>
              </template>
              <template v-else>
                <span>{{ isLogin ? "登录" : "注册" }}</span>
                <ArrowRight size="18" />
              </template>
            </button>
          </form>

          <div class="switch-mode">
            {{ isLogin ? "还没有账号？" : "已有账号？" }}
            <button type="button" @click="switchMode" class="switch-btn">
              {{ isLogin ? "立即注册" : "立即登录" }}
            </button>
          </div>
        </div>

        <div class="form-footer">
          <p>继续使用即表示您同意我们的</p>
          <div class="footer-links">
            <a href="#">服务条款</a>
            <span>·</span>
            <a href="#">隐私政策</a>
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
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Github,
  Chrome,
} from "lucide-vue-next";
const isLogin = ref(true);
const showPassword = ref(false);
const isLoading = ref(false);

const formData = reactive({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
});

// 表单错误信息
const errors = reactive({});

// 邮箱校验正则
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// 表单校验方法 - 逻辑和原代码完全一致
const validateForm = () => {
  const newErrors = {};

  if (!isLogin.value && !formData.username.trim()) {
    newErrors.username = "请输入用户名";
  }

  if (!formData.email.trim()) {
    newErrors.email = "请输入邮箱";
  } else if (!validateEmail(formData.email)) {
    newErrors.email = "请输入有效的邮箱地址";
  }

  if (!formData.password) {
    newErrors.password = "请输入密码";
  } else if (formData.password.length < 6) {
    newErrors.password = "密码至少需要6位字符";
  }

  if (!isLogin.value) {
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "请确认密码";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "两次输入的密码不一致";
    }
  }

  // 清空原有错误，赋值新错误
  Object.keys(errors).forEach((key) => delete errors[key]);
  Object.assign(errors, newErrors);

  return Object.keys(newErrors).length === 0;
};

// 表单提交方法（调用后端接口）
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  isLoading.value = true;

  try {
    if (isLogin.value) {
      const payload = {
        email: formData.email,
        password: formData.password,
      };
      const res = await userLogin(payload);
      const token = res?.token;
      const userName = res.user.username;
      const email = res.user.email;
      const role = res.user.role;
      if (token) localStorage.setItem("token", token);
      if (userName) localStorage.setItem("username", userName);
      if (email) localStorage.setItem("email", email);
      if (role) localStorage.setItem("role", role);
      ElMessage.success("登录成功");
      router.push({ name: "Home" });
    } else {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      };
      await userRegister(payload);
      isLogin.value = true;
    }
  } catch (err) {
    if (err && typeof err === "object") {
      if (err.errors) {
        Object.keys(errors).forEach((k) => delete errors[k]);
        Object.assign(errors, err.errors);
      } else if (err.message) {
        ElMessage.warning(err.message);
      } else {
        ElMessage.warning("请求出错，请稍后重试");
      }
    } else {
      ElMessage.warning(String(err));
    }
  } finally {
    isLoading.value = false;
  }
};

// 输入框内容改变事件
const handleInputChange = (e) => {
  const { name, value } = e.target;
  formData[name] = value;
  if (errors[name]) {
    errors[name] = "";
  }
};

// 切换登录/注册模式
const switchMode = () => {
  isLogin.value = !isLogin.value;
  // 清空错误信息
  Object.keys(errors).forEach((key) => delete errors[key]);
  // 重置表单数据
  formData.username = "";
  formData.email = "";
  formData.password = "";
  formData.confirmPassword = "";
};
</script>
<style lang="scss" scoped>
@import "@/styles/variables.scss";
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

/* 品牌区域 */
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

/* 表单区域 */
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

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #2d2d2d;
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

/* 响应式设计 */
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

  .social-login {
    grid-template-columns: 1fr;
  }
}
</style>
