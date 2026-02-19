<template>
  <div class="container py-4">
    <h1>Forgot Password</h1>

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
      <button class="btn btn-primary" type="submit" >Send Recovery Email</button>
    </form>
  </div>

  <div class="container py-4">
    <p>
      <router-link :to="{ name: 'login' }">Back to Login</router-link>
    </p>
  </div>

</template>

<script>
import { api } from "../api";

export default {
  name: "RecoverPage",
  data() {
    return {
        email: "",
        showPassword: false,
    };
  },
  computed: {
  },
  methods: {
    async submit() {
        try {
            const res = await api.post("/auth/forgot-password", {
            email: this.email,
        });
      } catch (err) {
      } finally {
        this.$router.push({ name: "passwordReset" });
      }
    },
  },
};
</script>