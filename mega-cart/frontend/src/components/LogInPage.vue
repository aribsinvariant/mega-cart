<template>
  <div class="container py-4">
    <h1>{{ $t("login.log_in") }}</h1>

    <form class="mt-3" @submit.prevent="submit">
      <div class="mb-3">
        <label class="form-label" for="email">{{ $t("login.email") }}</label>
        <input
          id="email"
          class="form-control"
          v-model.trim="email"
          autocomplete="email"
          required
        />
      </div>

       <div class="mb-3">
        <label class="form-label" for="password">{{ $t("login.password") }}</label>

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

      <button class="btn btn-primary" type="submit" :disabled="isFormNotValid">{{ $t("login.log_in") }}</button>
    </form>
  </div>

  <div class="container py-4">
    <p>
      {{ $t("login.dont_have_an_account") }}
      <router-link :to="{ name: 'signup' }">{{ $t("login.sign_up") }}</router-link>
    </p>
  </div>

  <div class="container py-4">
    <p>
      {{ $t("login.forgot_your_password") }}
      <router-link :to="{ name: 'passwordRecovery' }">{{ $t("login.reset_password") }}</router-link>
    </p>
  </div>
</template>

<script>
import { api } from "../api";
import { auth } from "../logged/auth";

export default {
  name: "LogInPage",
  data() {
    return {
        email: "",
        password: "",
        showPassword: false,
    };
  },
  computed: {
        isFormNotValid() {
            return !this.email.includes("@") || this.password.length < 6;
        },
  },
  methods: {
        togglePassword() {
        this.showPassword = !this.showPassword;
        },
    async submit() {
        try {
        const res = await api.post("/auth/login", {
          email: this.email,
          password: this.password,
        });

        // Typically you receive a token:
        // { token: "....", user: {...} }
        const { token } = res.data;

        // store token so future requests are authenticated
        auth.setToken(token);
        this.$router.push({ name: "carts" });

        this.$router.push({ name: "carts" });
        this.$emit("login-success");

        // tell parent to go home
        this.$emit("login-success");
      } catch (err) {
        // show a message instead of alert in real apps
        console.error(err);
        alert("Login failed. Check email/password.");
      } finally {
        this.email = "";
        this.password = "";
        this.showPassword = false;
      }
    },
  },
};
</script>