<template>
  <div class="container py-4">
    <h1>{{ $t('security_settings.change_email_password') }}</h1>


    <div class="mb-4">
      <button type="button" class="btn btn-outline-primary" @click="toggleSection('email')">
        {{ $t('security_settings.change_email') }}
      </button>
      <form v-if="activeSection === 'email'" class="mt-3" @submit.prevent="changeEmail">
        <div class="mb-3">
          <label class="form-label" for="newEmail">{{ $t('security_settings.new_email') }}</label>
          <input
            id="newEmail"
            type="email"
            class="form-control"
            v-model.trim="newEmail"
            autocomplete="email"
            required
          />
        </div>
        <div class="mb-3">
          <label class="form-label" for="emailPassword">{{ $t('security_settings.current_password') }}</label>
          <div class="input-group">
            <input
              id="emailPassword"
              :type="showEmailPassword ? 'text' : 'password'"
              class="form-control"
              v-model="emailPassword"
              autocomplete="current-password"
              required
            />
            <button type="button" class="btn btn-outline-secondary" @click="showEmailPassword = !showEmailPassword">
              {{ showEmailPassword ? $t('security_settings.hide') : $t('security_settings.show') }}
            </button>
          </div>
        </div>
        <p v-if="emailMsg" :class="emailSuccess ? 'text-success' : 'text-danger'">{{ emailMsg }}</p>
        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-primary" :disabled="!newEmail.includes('@') || !emailPassword">
            {{ $t('security_settings.save') }}
          </button>
          <button type="button" class="btn btn-outline-secondary" @click="toggleSection(null)">
            {{ $t('security_settings.cancel') }}
          </button>
        </div>
      </form>
    </div>

    <div class="mb-4">
      <button type="button" class="btn btn-outline-primary" @click="toggleSection('password')">
        {{ $t('security_settings.change_password') }}
      </button>
      <form v-if="activeSection === 'password'" class="mt-3" @submit.prevent="changePassword">
        <div class="mb-3">
          <label class="form-label" for="oldPassword">{{ $t('security_settings.current_password') }}</label>
          <div class="input-group">
            <input
              id="oldPassword"
              :type="showOldPassword ? 'text' : 'password'"
              class="form-control"
              v-model="oldPassword"
              autocomplete="current-password"
              required
            />
            <button type="button" class="btn btn-outline-secondary" @click="showOldPassword = !showOldPassword">
              {{ showOldPassword ? $t('security_settings.hide') : $t('security_settings.show') }}
            </button>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="newPassword">{{ $t('security_settings.new_password') }}</label>
          <div class="input-group">
            <input
              id="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              class="form-control"
              v-model="newPassword"
              autocomplete="new-password"
              required
              minlength="6"
            />
            <button type="button" class="btn btn-outline-secondary" @click="showNewPassword = !showNewPassword">
              {{ showNewPassword ? $t('security_settings.hide') : $t('security_settings.show') }}
            </button>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="confirmPassword">{{ $t('security_settings.confirm_new_password') }}</label>
          <div class="input-group">
            <input
              id="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="form-control"
              v-model="confirmPassword"
              autocomplete="new-password"
              required
              minlength="6"
            />
            <button type="button" class="btn btn-outline-secondary" @click="showConfirmPassword = !showConfirmPassword">
              {{ showConfirmPassword ? $t('security_settings.hide') : $t('security_settings.show') }}
            </button>
          </div>
        </div>
        <p v-if="passwordMsg" :class="passwordSuccess ? 'text-success' : 'text-danger'">{{ passwordMsg }}</p>
        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-primary" :disabled="isPasswordFormInvalid">
            {{ $t('security_settings.save') }}
          </button>
          <button type="button" class="btn btn-outline-secondary" @click="toggleSection(null)">
            {{ $t('security_settings.cancel') }}
          </button>
        </div>
      </form>
    </div>

    <button class="btn btn-secondary mb-4" @click="$router.push({ name: 'accountSettings' })">
      {{ $t('security_settings.back_to_account_settings') }}
    </button>

  </div>
</template>

<script>
import { api } from "../api";

export default {
  name: "SecuritySettings",
  data() {
    return {
      activeSection: null,

      newEmail: "",
      emailPassword: "",
      showEmailPassword: false,
      emailMsg: "",
      emailSuccess: false,

      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
      showOldPassword: false,
      showNewPassword: false,
      showConfirmPassword: false,
      passwordMsg: "",
      passwordSuccess: false,
    };
  },
  computed: {
    isPasswordFormInvalid() {
      return !this.oldPassword || this.newPassword.length < 6 || this.newPassword !== this.confirmPassword;
    },
  },
  methods: {
    toggleSection(section) {
      if (this.activeSection === section) {
        this.activeSection = null;
      } else {
        this.activeSection = section;
        this.resetForms();
      }
    },
    resetForms() {
      this.newEmail = "";
      this.emailPassword = "";
      this.showEmailPassword = false;
      this.emailMsg = "";
      this.emailSuccess = false;
      this.oldPassword = "";
      this.newPassword = "";
      this.confirmPassword = "";
      this.showOldPassword = false;
      this.showNewPassword = false;
      this.showConfirmPassword = false;
      this.passwordMsg = "";
      this.passwordSuccess = false;
    },
    async changeEmail() {
      this.emailMsg = "";
      try {
        await api.put("/auth/account/email", {
          email: this.newEmail,
          password: this.emailPassword,
        });
        this.emailMsg = this.$t('security_settings.email_updated');
        this.emailSuccess = true;
        this.newEmail = "";
        this.emailPassword = "";
      } catch (e) {
        this.emailMsg = e.response?.data?.error || this.$t('security_settings.update_failed');
        this.emailSuccess = false;
      }
    },
    async changePassword() {
      this.passwordMsg = "";
      try {
        await api.put("/auth/account/password", {
          oldPassword: this.oldPassword,
          newPassword: this.newPassword,
        });
        this.passwordMsg = this.$t('security_settings.password_updated');
        this.passwordSuccess = true;
        this.oldPassword = "";
        this.newPassword = "";
        this.confirmPassword = "";
      } catch (e) {
        this.passwordMsg = e.response?.data?.error || this.$t('security_settings.update_failed');
        this.passwordSuccess = false;
      }
    },
  },
};
</script>