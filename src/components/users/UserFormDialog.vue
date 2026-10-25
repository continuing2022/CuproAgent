<template>
  <el-dialog
    v-model="showUserForm"
    :title="isEditing ? t('edit_user') : t('add_user')"
    :width="formDialogWidth"
    :close-on-click-modal="false"
    class="user-form-dialog"
  >
    <el-form
      :model="userForm"
      :rules="userFormRules"
      ref="userFormRef"
      :label-width="formLabelWidth"
      :label-position="formLabelPosition"
    >
      <el-form-item :label="t('username')" prop="username">
        <el-input
          v-model="userForm.username"
          :placeholder="t('enter_username')"
        />
      </el-form-item>

      <el-form-item :label="t('email')" prop="email">
        <el-input v-model="userForm.email" :placeholder="t('enter_email')" />
      </el-form-item>

      <el-form-item :label="t('role')" prop="role">
        <el-radio-group v-model="userForm.role">
          <el-radio label="user">{{ t("normal_user") }}</el-radio>
          <el-radio label="admin">{{ t("admin") }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="!isEditing" :label="t('password')" prop="password">
        <el-input
          v-model="userForm.password"
          type="password"
          :placeholder="t('enter_password')"
          show-password
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="showUserForm = false">{{ t("cancel") }}</el-button>
        <el-button type="primary" @click="submitUserForm">
          {{ isEditing ? t("save") : t("add") }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from "vue";
import { t } from "@/i18n";
import { useViewportWidth } from "@/composables/useViewportWidth";

const showUserForm = defineModel({ type: Boolean, required: true });
const userForm = defineModel("form", { type: Object, required: true });
defineProps({ isEditing: Boolean });
const emit = defineEmits(["submit"]);
const userFormRef = ref(null);
const viewportWidth = useViewportWidth();
const formDialogWidth = computed(() =>
  viewportWidth.value <= 480
    ? "95%"
    : viewportWidth.value <= 640
      ? "90%"
      : "500px",
);
const formLabelPosition = computed(() =>
  viewportWidth.value <= 640 ? "top" : "right",
);
const formLabelWidth = computed(() =>
  viewportWidth.value <= 480 ? "100%" : "100px",
);

const userFormRules = {
  username: [
    { required: true, message: t("enter_username"), trigger: "blur" },
    { min: 2, max: 20, message: t("username_length_2_20"), trigger: "blur" },
  ],
  email: [
    { required: true, message: t("enter_email"), trigger: "blur" },
    { type: "email", message: t("invalid_email_format"), trigger: "blur" },
  ],
  role: [{ required: true, message: t("choose_role"), trigger: "change" }],
  password: [
    { required: true, message: t("enter_password"), trigger: "blur" },
    { min: 6, message: t("password_min_6"), trigger: "blur" },
  ],
};

async function submitUserForm() {
  if (!userFormRef.value) return;
  const valid = await userFormRef.value.validate().catch(() => false);
  if (valid) emit("submit");
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
