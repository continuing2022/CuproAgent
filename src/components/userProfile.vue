<template>
  <div class="profile-menu-container">
    <!-- 閻熸瑱绠戣ぐ鍌炲箰婢舵劖灏?-->
    <div class="profile-trigger-wrapper">
      <button class="profile-trigger-btn" @click="isOpen = !isOpen">
        <div class="avatar-sm">{{ userProfile }}</div>
        <div class="user-info-sm">
          <div class="username-sm">{{ username }}</div>
          <div class="usertier-sm">{{ userTier }}</div>
        </div>
      </button>

      <!-- 濞戞挸顑嗘刊娲嚕濠婂啫绀?-->
      <transition
        enter-active-class="animate-in"
        leave-active-class="animate-out"
      >
        <div v-if="isOpen" class="dropdown-wrapper">
          <!-- 闂侇剦鍠氶崓鐢典沪?-->
          <div class="dropdown-mask" @click="isOpen = false" />

          <!-- 闁兼寧绮屽畷鐔煎礃閸涱収鍟?-->
          <div class="dropdown-content">
            <!-- 闁活潿鍔嶉崺娑欑┍閳╁啩绱栧鑸垫尦閸?-->
            <div class="dropdown-header">
              <div class="avatar-lg">{{ userProfile }}</div>
              <div class="user-info-lg">
                <div class="username-lg" :title="username">{{ username }}</div>
                <div class="userEmail-lg" :title="userEmail">
                  {{ userEmail }}
                </div>
              </div>
            </div>

            <!-- 闁兼寧绮屽畷鐔搞亜?-->
            <div class="dropdown-menu">
              <!-- 閻犱礁澧介悿?-> 閻犲浂鍙€閳诲牓宕氶崶銊ュ簥 -->
              <div
                class="menu-item"
                style="justify-content: space-between; align-items: center"
              >
                <div style="display: flex; align-items: center; gap: 0.75rem">
                  <Settings class="menu-icon" />
                  <el-switch
                    class="language-switch"
                    v-model="isEnglish"
                    :active-text="t('lang_en_short')"
                    :inactive-text="t('lang_zh_short')"
                  />
                </div>
              </div>
              <!-- 濞戞搩浜欏Ч澶嬬┍閳╁啩绱?-->
              <button class="menu-item" @click="showUserDetail = true">
                <User class="menu-icon" />
                <span class="menu-text">{{ t("personal_info") }}</span>
              </button>
              <!-- 闁告艾楠歌ぐ瀵哥不閿涘嫭鍊?-->
              <button class="menu-item menu-item-border" @click="onUserManage">
                <HelpCircle class="menu-icon" />
                <span class="menu-text">{{ t("backend_manage") }}</span>
                <span class="menu-arrow">&#8250;</span>
              </button>
              <!-- 闂侇偀鍋撻柛鎴ｆ濞呫儴銇?-->
              <button class="menu-item logout-item" @click="handleLogout">
                <LogOut class="menu-icon menu-icon-logout" />
                <span class="menu-text menu-text-logout">{{
                  t("logout")
                }}</span>
              </button>
            </div>
          </div>
        </div>
      </transition>
      <!-- 濞戞搩浜欏Ч澶嬬┍閳╁啩绱栭悗鐢殿攰閻﹁棄顩奸崱顓犵闁告瑯浜ｉ浼存晬?-->
      <UserDetailDialog v-model="showUserDetail" />
    </div>
  </div>
</template>

<script setup>
// 閻庣數鍘ч崣鍝e3闁告繂绉寸花鎻掝嚕韫囨洖笑闁?
import { ref, computed } from "vue";
// 閻庣數鍘ч崣鍞媢cide-vue-next闁搞儳鍋撻悥?
import { User, Settings, HelpCircle, LogOut } from "lucide-vue-next";
import router from "@/router";
import UserDetailDialog from "@/components/UserDetailDialog.vue";
import { userLogout } from "@/api";
import { t, locale, setLocale } from "@/i18n";
// 闁硅矇鍐ㄧ厬濞戞挸顑嗘刊娲嚕濠婂啫绀嬮柡鍕畺濞?
const isOpen = ref(false);
// 閻犲浂鍙€閳诲牏鎷嬮崜褏鏋傞柨?zh' 闁?'en'闁挎稑顧€缁辨繈鏌呭宕囩畺 i18n 缂佺媴绱曢幃?
const isEnglish = computed({
  get: () => locale.value === "en",
  set: (v) => {
    setLocale(v ? "en" : "zh");
    // 闁稿繑濞婂Λ瀛樼▔鐎ｎ偄顎欓柤鎸庣矊瀹?
    isOpen.value = false;
  },
});
// 闁硅矇鍐ㄧ厬闁活潿鍔嶉崺娑氭嫚閿旇棄鍓伴悗鐢殿攰閻﹁棄顩?
const showUserDetail = ref(false);
// 闁活潿鍔嶉崺娑欑┍閳╁啩绱栭悽顖涙倐閸?
const username = ref(localStorage.getItem("username") || t("default_user"));
const userEmail = ref(localStorage.getItem("email") || "@example.com");
const userProfile = ref(username.value.charAt(0).toUpperCase());
const userTier = computed(() =>
  localStorage.getItem("role") === "admin" ? t("admin") : t("normal_user"),
);

// 闂侇偀鍋撻柛鎴ｆ濞呫儴銇愰弴鐔哥厵婵?
const handleLogout = async () => {
  ElMessageBox.confirm(t("confirm_logout"), t("warning"), {
    confirmButtonText: t("ok"),
    cancelButtonText: t("cancel"),
    type: "warning",
    customClass: "logout-confirm-box",
  })
    .then(async () => {
      // 閻犲鍟伴弫?API 闂侇偀鍋撻柛鎴ｆ濞呫儴銇?
      await userLogout();
      // 闁告帡鏀遍弻濠冦亜閻㈠憡妗ㄩ柟瀛樼墵閸ｅ摜鈧鑹鹃幃婊堝礆閹殿喗顏㈢憸鐗堟礋閵?
      window.location.reload();
    })
    .catch(() => {});
};
const onUserManage = () => {
  ElMessageBox.confirm(t("enter_admin"), t("warning"), {
    confirmButtonText: t("ok"),
    cancelButtonText: t("cancel"),
    type: "info",
    customClass: "logout-confirm-box",
  }).then(() => {
    const role = localStorage.getItem("role");
    if (role === "admin") {
      router.push({ name: "Usermanagement" });
    } else {
      ElMessage.error(t("no_permission"));
    }
  });
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";
/* 闁哄秶鎳撻鎰板闯椤帞绐楅悘鐐叉噸閼?闁煎啿鏈▍?*/
.profile-menu-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  background-color: transparent;
  width: 100%;
}

/* 閻熸瑱绠戣ぐ鍌炲箰婢舵劖灏﹀鑸电墪閻即鏁嶅杈ㄧゲ閻庣數鎳撻悾鐐媴?*/
.profile-trigger-wrapper {
  position: relative;
  width: 100%;
}

/* 閻熸瑱绠戣ぐ鍌炲箰婢舵劖灏﹂柡宥呭槻缁?*/
.profile-trigger-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background-color: #f97316;
  color: #ffffff;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease;
  cursor: pointer;
  border: none;
  width: 100%;
}
.profile-trigger-btn:hover {
  background-color: #ea580c;
}

/* 閻忓繐绻愰妵鏃堝磽韫囥儳绐楅悷娆欑畱瑜板倿骞愭径鎰唉闁?*/
.avatar-sm {
  width: 2rem;
  height: 2rem;
  background-color: #facc15;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ea580c;
  font-weight: 700;
  font-size: 0.875rem;
}

/* 濠㈠爢鍐︿粓闁稿秴楠忕槐鐗堢▔鐎ｎ偄顎欓柤鎸庣矊瀹曠喖宕?*/
.avatar-lg {
  width: 3rem;
  height: 3rem;
  background-color: #facc15;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ea580c;
  font-weight: 700;
  font-size: 1.25rem;
}

/* 閻熸瑱绠戣ぐ鍌炲箰婢舵劖灏﹂柛鎰噽濞堟垿鎮介妸锕€鐓曢悘蹇撶箣娣囧﹪骞?*/
.user-info-sm {
  text-align: left;
}
.username-sm {
  font-weight: 500;
}
.usertier-sm {
  font-size: 0.75rem;
  color: #ffedd5;
}

/* 濞戞挸顑嗘刊娲嚕濠婂啫绀嬪鑸电墪閻即鏁嶅顒€鐦堕柛姘煎亰娴煎嫮绱旈埡浣瑰闁告劕鎳庨?*/
.dropdown-wrapper {
  position: relative;
  z-index: 50;
}

/* 闂侇剦鍠氶崓鐢典沪閸岋妇绐楅柛蹇嬪妼閻棝鏌呰箛鏃€顫栭梺顒夊枤閸?*/
.dropdown-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  cursor: pointer;
}

/* 濞戞挸顑嗘刊娲嚕濠婂啫绀嬮柛鎰噹椤旀劗鈧湱鎳撳▍?*/
.dropdown-content {
  position: absolute;
  left: -10px;
  top: -345px;
  width: 265px;
  background: linear-gradient(135deg, #ffffff 0%, #fff8f3 100%);
  border-radius: 0.75rem;
  box-shadow:
    0 25px 50px -12px rgba(255, 122, 31, 0.3),
    0 0 0 1px rgba(255, 140, 58, 0.1);
  overflow: hidden;
  border: 2px solid #ff8c3a;
  z-index: 50;
}

/* 濞戞挸顑嗘刊娲嚕濠婂啫绀嬪鑸垫尦閸庢挳鏁嶅杈ㄦ殢闁圭娓规穱濠囧箒?*/
.dropdown-header {
  padding: 1rem;
  border-bottom: 2px solid #ffe4d1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, #fff5ed 0%, #ffffff 100%);
}

.user-info-lg .username-lg {
  color: #1f2937;
  font-weight: 600;
  font-size: 1.125rem;
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-info-lg .userEmail-lg {
  color: #ff8c3a;
  font-size: 0.875rem;
  font-weight: 500;
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 闁兼寧绮屽畷鐔搞亜閻熼偊鍟囬柛?*/
.dropdown-menu {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  background: #ffffff;
}

/* 闂侇偅姘ㄩ弫銈夋嚕濠婂啫绀嬪銈堫潐閻楀崬顕?*/
.menu-item {
  width: 100%;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: transparent;
  border: none;
  color: #374151;
  text-align: left;
  transition: all 0.3s ease;
  cursor: pointer;
  font-weight: 500;
  position: relative;
}

.menu-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(90deg, #ff8c3a 0%, transparent 100%);
  transition: width 0.3s ease;
}

.menu-item:hover {
  background: linear-gradient(90deg, #fff5ed 0%, #ffffff 100%);
  color: #ff7a1f;
  transform: translateX(4px);
}

.menu-item:hover::before {
  width: 4px;
}

/* 闁兼寧绮屽畷鐔搞亜閻熺増绂堥柡宥呮喘閳ь剚姘ㄩ弫銈夊冀瀹勬壆纭€ */
.menu-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #ff8c3a;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.menu-item:hover .menu-icon {
  color: #ff7a1f;
  transform: scale(1.1);
}

.language-switch {
  --el-switch-on-color: #ff8c3a;
  --el-switch-off-color: #ffd8bd;
}

.language-switch:deep(.el-switch__core) {
  border: 1px solid rgba(255, 140, 58, 0.45);
  box-shadow: inset 0 1px 3px rgba(255, 122, 31, 0.18);
}

.language-switch:deep(.el-switch__action) {
  border: 1px solid rgba(255, 140, 58, 0.2);
}

.language-switch:deep(.el-switch__label) {
  color: #b86932;
  font-weight: 500;
}

.language-switch:deep(.el-switch__label.is-active) {
  color: #ff7a1f;
}

/* 閻㈩垼鍠栨慨顏堟嚕濠婂啫绀嬪銈囨缁辩増鎯旈弴銏犲姤閺夊牐顫夐、?闁告瑥鍘栭弲鍓佺不椤撶偑浠?*/
.menu-item-border {
  border-bottom: 1px solid #ffe4d1;
}

.menu-arrow {
  margin-left: auto;
  color: #ff8c3a;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.menu-item:hover .menu-arrow {
  color: #ff7a1f;
  transform: translateX(4px);
}

/* 闂侇偀鍋撻柛鎴ｆ濞呫儴銇愰弴鐔风樆闂佺瓔鍠氭竟鎺戔枔婵犲啰澹夌€?*/
.menu-item.logout-item {
  color: #ef4444;
  margin-top: 0.5rem;
  border-top: 2px solid #ffe4d1;
}

.menu-item.logout-item .menu-icon {
  color: #ef4444;
}

.menu-item.logout-item:hover {
  background: linear-gradient(90deg, #fee2e2 0%, #ffffff 100%);
  color: #dc2626;
}

.menu-item.logout-item:hover .menu-icon {
  color: #dc2626;
}

.menu-item.logout-item:hover::before {
  background: linear-gradient(90deg, #ef4444 0%, transparent 100%);
}
</style>
