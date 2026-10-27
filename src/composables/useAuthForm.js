import { computed, nextTick, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { userLogin, userRegister, userResetPassword, requestPasswordReset } from "@/api";
import { t } from "@/i18n";
import router from "@/router";
import { setAuthSession, clearAuthSession } from "@/utils/authStorage";
import { setPendingFlashMessage } from "@/utils/flashMessage";
import {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
} from "@/utils/authValidation";

export function useAuthForm() {
  const formRef = ref(null);
  const resetToken = ref("");
  const mode = ref("login");
  const isLogin = computed(() => mode.value === "login");
  const isForgotPassword = computed(() => mode.value === "forgot-password");
  const isResetPassword = computed(() => mode.value === "reset-password");
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

  const isRegister = computed(() => mode.value === "register");
  const modeText = {
    login: {
      title: "welcome_back",
      description: "login_continue_desc",
      submit: "login",
      prompt: "no_account",
      action: "register_now",
    },
    register: {
      title: "create_account",
      description: "start_journey_desc",
      submit: "register",
      prompt: "has_account",
      action: "login_now",
    },
    "reset-password": {
      title: "reset_password",
      description: "reset_password_desc",
      submit: "reset_password_submit",
      prompt: "remember_password",
      action: "login_now",
    },
    "forgot-password": {
      title: "reset_password",
      description: "reset_request_desc",
      submit: "reset_request_submit",
      prompt: "remember_password",
      action: "login_now",
    },
  };
  const formTitle = computed(() => t(modeText[mode.value].title));
  const formDescription = computed(() => t(modeText[mode.value].description));
  const submitText = computed(() => t(modeText[mode.value].submit));
  const switchPrompt = computed(() => t(modeText[mode.value].prompt));
  const switchActionText = computed(() => t(modeText[mode.value].action));

  const authMessageKeyMap = {
    "invalid or expired reset token": ["reset_token_invalid", "重置链接无效或已过期，请重新申请"],
    "password reset temporarily unavailable": ["reset_unavailable", "密码重置暂不可用，请稍后重试"],
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
    "email not registered": ["auth_email_not_registered", "该邮箱尚未注册"],
    "validation failed": ["auth_validation_failed", "请先修正表单中的错误"],
  };

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
    username: isRegister.value
      ? [{ validator: validateUsernameField, trigger: "blur" }]
      : [],
    email: isResetPassword.value ? [] : [{ validator: validateEmailField, trigger: "blur" }],
    password: isForgotPassword.value ? [] : [{ validator: validatePasswordField, trigger: "blur" }],
    confirmPassword: isLogin.value || isForgotPassword.value
      ? []
      : [{ validator: validateConfirmPasswordField, trigger: "blur" }],
  }));

  async function switchMode(
    nextMode = isLogin.value ? "register" : "login",
    options = {},
  ) {
    const { preserveEmail = false } = options;
    mode.value = nextMode;
    if (nextMode !== "reset-password") resetToken.value = "";
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

  function enterForgotPassword() {
    return switchMode("forgot-password", { preserveEmail: true });
  }

  watch(() => router.currentRoute.value.hash, async (hash) => {
    const token = new URLSearchParams(hash.slice(1)).get("reset-token");
    if (!token) return;
    await switchMode("reset-password");
    resetToken.value = token;
    // Update router state as well as browser history; Login may be reused for
    // same-page links. The credential lives only in this component afterward.
    await router.replace({ name: "Login", query: router.currentRoute.value.query, hash: "" });
  }, { immediate: true });

  async function handleSubmit() {
    if (!formRef.value || isLoading.value) return;

    formData.email = normalizeEmail(formData.email);
    if (isRegister.value) {
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

      if (isForgotPassword.value) {
        await requestPasswordReset({ email: formData.email });
        ElMessage.success(t("reset_request_accepted"));
        return;
      }

      if (isResetPassword.value) {
        await userResetPassword({
          token: resetToken.value,
          password: formData.password,
        });

        clearAuthSession();
        ElMessage.success(t("reset_password_success"));
        await switchMode("login", { preserveEmail: true });
        return;
      }

      await userRegister({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      ElMessage.success(t("register_success", "注册成功，请登录"));
      await switchMode("login", { preserveEmail: true });
    } catch (err) {
      const fieldErrors = err?.fieldErrors;
      if (fieldErrors && typeof fieldErrors === "object") {
        applyServerErrors(fieldErrors);
        const firstField = Object.keys(fieldErrors)[0];
        await nextTick();
        formRef.value?.scrollToField?.(firstField);
        return;
      }

      ElMessage.warning(mapAuthMessage(err?.message));
    } finally {
      isLoading.value = false;
    }
  }

  return {
    formRef,
    isLogin,
    isRegister,
    isForgotPassword,
    isResetPassword,
    isLoading,
    rememberMe,
    formData,
    serverErrors,
    formTitle,
    formDescription,
    submitText,
    switchPrompt,
    switchActionText,
    formRules,
    clearServerError,
    normalizeField,
    handlePasswordInput,
    switchMode,
    enterForgotPassword,
    handleSubmit,
  };
}
