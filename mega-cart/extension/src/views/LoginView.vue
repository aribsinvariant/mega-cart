<template>
  <div class="container py-4">
    <h5 class="mb-1">Sign in to Mega Cart</h5>
    <p class="text-muted mb-4" style="font-size:13px;">Add items from any page directly to your carts.</p>

    <form @submit.prevent="submit">
      <div class="mb-3">
        <label class="form-label" for="ext-email">Email</label>
        <input
          id="ext-email"
          class="form-control"
          v-model.trim="email"
          type="email"
          autocomplete="email"
          required
        />
      </div>

      <div class="mb-3">
        <label class="form-label" for="ext-password">Password</label>
        <div class="input-group">
          <input
            :type="showPassword ? 'text' : 'password'"
            id="ext-password"
            class="form-control"
            v-model="password"
            autocomplete="current-password"
            required
            minlength="6"
          />
          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>

      <div v-if="errorMsg" class="alert alert-danger py-2 mb-3" style="font-size:13px;">
        {{ errorMsg }}
      </div>

      <button
        class="btn btn-primary w-100"
        type="submit"
        :disabled="isFormNotValid || loading"
      >
        {{ loading ? 'Signing in…' : 'Log in' }}
      </button>
    </form>

    <hr class="my-3" />
    <p class="text-muted mb-0" style="font-size:12px;">
      Don't have an account?
      <a :href="signupUrl" target="_blank" class="text-decoration-none">Sign up here</a>.
    </p>
  </div>
</template>

<script>
import { api }  from '../api.js'
import { auth } from '../auth.js'

export default {
  name: 'LoginView',
  emits: ['login-success'],

  data() {
    return {
      email: '',
      password: '',
      showPassword: false,
      loading: false,
      errorMsg: '',
      signupUrl: import.meta.env.VITE_APP_URL
        ? `${import.meta.env.VITE_APP_URL}/signup`
        : 'http://localhost:5173/signup',
    }
  },

  computed: {
    isFormNotValid() {
      return !this.email.includes('@') || this.password.length < 6
    },
  },

  methods: {
    async submit() {
      if (this.isFormNotValid) return
      this.loading  = true
      this.errorMsg = ''
      try {
        const res = await api.post('/auth/login', {
          email: this.email,
          password: this.password,
        })
        const { token } = res.data
        auth.email = this.email
        await auth.setToken(token)
        this.$emit('login-success')
      } catch (err) {
        this.errorMsg = err?.response?.data?.message ?? 'Login failed. Check your email and password.'
      } finally {
        this.loading = false
      }
    },
  },
}
</script>