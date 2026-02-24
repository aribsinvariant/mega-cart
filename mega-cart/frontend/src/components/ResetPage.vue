<template>
  <div class="container py-4">
    <h1>{{ $t("reset.password_reset") }}</h1>

    <form class="mt-3" @submit.prevent="submit">
      <div class="mb-3">
        <label class="form-label" for="token">{{ $t("reset.token") }}</label>
        <input
          id="token"
          class="form-control"
          v-model.trim="token"
          autocomplete="one-time-code"
          required
        />
      </div>

       <div class="mb-3">
        <label class="form-label" for="password">{{ $t("reset.new_password") }}</label>

        <div class="input-group">
          <input
            :type="showPassword ? 'text' : 'password'"
            id="password"
            class="form-control"
            v-model="password"
            autocomplete="new-password"
            required
            minlength="6"
          />

          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="togglePassword"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
          >
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label" for="password">{{ $t("reset.verify_new_password") }}</label>

        <div class="input-group">
          <input
            :type="showPassword2 ? 'text' : 'password'"
            id="password2"
            class="form-control"
            v-model="password2"
            autocomplete="new-password"
            required
            minlength="6"
          />

          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="togglePassword2"
            :aria-label="showPassword2 ? 'Hide password' : 'Show password'"
          >
            {{ showPassword2 ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>

      <button class="btn btn-primary" type="submit" :disabled="isFormNotValid">{{ $t("reset.log_in") }}</button>
    </form>
  </div>

  <div class="container py-4">
    <p>
      {{ $t("reset.didnt_receive_a_reset_email") }}
      <router-link :to="{ name: 'passwordRecovery' }">{{ $t("reset.back_to_password_recovery") }}</router-link>
    </p>
  </div>
</template>

<script>
import { api } from "../api";
import { auth } from "../logged/auth";

export default {
  name: "ResetPage",
  data() {
    return {
        token: "",
        password: "",
        password2: "",
        showPassword: false,
        showPassword2: false,
    };
  },
  computed: {
        isFormNotValid() {
            return this.token.length < 1 || this.password.length < 6 || this.password !== this.password2;
        },
  },
  methods: {
        togglePassword() {
        this.showPassword = !this.showPassword;
        },
        togglePassword2() {
        this.showPassword2 = !this.showPassword2;
        },
    async submit() {
        try {
        const res = await api.post("/auth/reset-password", {
          token: this.token,
          password: this.password,
        });
      } catch (err) {
        console.error(err);
        alert("Reset failed. Check token/password.");
      } finally {        
        this.token = "";   
        this.password = "";
        this.password2 = "";
        this.showPassword = false;
        this.showPassword2 = false;
      }
    },
  },
};
</script>