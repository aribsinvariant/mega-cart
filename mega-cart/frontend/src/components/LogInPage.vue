<template>
  <div class="container py-4">
    <h1>Log In</h1>

    <form class="mt-3" @submit.prevent="submit">
      <div class="mb-3">
        <label class="form-label" for="email">Email</label>
        <input
          id="email"
          class="form-control"
          v-model.trim="email"
          autocomplete="email"
          required
        />
      </div>

       <div class="mb-3">
        <label class="form-label" for="password">Password</label>

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

      <button class="btn btn-primary" type="submit" :disabled="isFormNotValid">Log In</button>
    </form>
  </div>
</template>

<script>
export default {
  name: "SignUpPage",
  data() {
    return {
        email: "",
        password: "",
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
    submit() {
        console.log("login:", { email: this.email, password: this.password});
        if (this.email.includes("@") && this.password.length >= 6) {
            this.$emit("login-success");
        }
        this.email = "";
        this.password = "";
    },
  },
};
</script>