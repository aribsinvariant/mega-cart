<template>
  <div class="container py-4">
    <h1>{{ $t("signup.sign_up") }}</h1>

    <form class="mt-3" @submit.prevent="submit">
      <div class="mb-3">
        <label class="form-label" for="email">{{ $t("reset.email") }}</label>
        <input
          id="email"
          class="form-control"
          v-model.trim="email"
          autocomplete="email"
          required
        />
      </div>

      <div class="mb-3">
        <label class="form-label" for="fullName">{{ $t("reset.full_name") }}</label>
        <input
          id="fullName"
          class="form-control"
          v-model.trim="fullName"
          autocomplete="name"
          required
        />
      </div>

       <div class="mb-3">
        <label class="form-label" for="password">{{ $t("reset.password_at_least_6_char") }}</label>

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

      <button class="btn btn-primary" type="submit" :disabled="isFormNotValid">{{ $t("reset.create_account") }}</button>
    </form>
  </div>

  <div class="container py-4">
    <p>
      {{ $t("reset.already_have_an_account") }}
      <router-link :to="{ name: 'login' }">{{ $t("reset.log_in") }}</router-link>
    </p>
  </div>
</template>

<script>
import { api } from "../api";

export default {
  name: "SignUpPage",
  data() {
    return {
        email: "",
        password: "",
        fullName: "",
        showPassword: false,
        isFormNotValid: true,
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
        await api.post("/auth/register", {
          username: this.fullName,
          email: this.email,
          password: this.password,
        });

        // optionally auto-login after signup:
        // const { token } = (await api.post("/auth/login", {...})).data
        // localStorage.setItem("token", token)

        this.$emit("signup-success");
      } catch (err) {
          console.error(err);
          alert("Sign up failed (maybe email already used).");
      } finally {
          this.fullName = "";
          this.email = "";
          this.password = "";
          this.showPassword = false;
      }
    }
  }
};
</script>