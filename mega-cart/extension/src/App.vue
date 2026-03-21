<template>
  <div class="extension-popup" :class="{ 'dark-mode': isDarkMode }">

    <nav class="navbar navbar-dark bg-dark px-3 py-2">
      <div class="d-flex align-items-center gap-2 w-100">
        
        <img src="/Logo.png" alt="Mega Cart" height="28" class="me-1" /><span class="navbar-brand mb-0 me-auto" style="font-size: 15px;">Mega Cart</span>
        <template v-if="isLoggedIn">
          <span class="text-secondary" style="font-size: 12px;">{{ userEmail }}</span>
          <button class="btn btn-outline-light btn-sm" @click="handleLogout">Log out</button>
        </template>
      </div>
    </nav>

    <transition name="fade" mode="out-in">
      <LoginView
        v-if="currentView === 'login'"
        key="login"
        @login-success="onLoginSuccess"
      />
      <MainView
        v-else-if="currentView === 'main'"
        key="main"
        :carts="carts"
        :loading="cartsLoading"
        :page-url="pageUrl"
        @item-added="onItemAdded"
        @go-import="currentView = 'import'"
      />
      <ImportView
        v-else-if="currentView === 'import'"
        key="import"
        :carts="carts"
        :loading="cartsLoading"
        @back="currentView = 'main'"
        @import-done="onImportDone"
      />
      <SuccessView
        v-else-if="currentView === 'success'"
        key="success"
        :message="successMessage"
        @again="currentView = 'main'"
      />
    </transition>
  </div>
</template>

<script>
import { auth, isLoggedIn } from './auth.js'
import { api } from './api.js'
import LoginView   from './views/LoginView.vue'
import MainView    from './views/MainView.vue'
import ImportView  from './views/ImportView.vue'
import SuccessView from './views/SuccessView.vue'

export default {
  name: 'App',
  components: { LoginView, MainView, ImportView, SuccessView },

  data() {
    return {
      currentView: 'login',
      isDarkMode: false,
      pageUrl: '',
      carts: [],
      cartsLoading: false,
      successMessage: {},
    }
  },

  computed: {
    isLoggedIn() { return isLoggedIn.value },
    userEmail()  { return auth.email ?? '' },
  },

  async created() {
    const dark = await this.getDarkMode()
    this.isDarkMode = dark
    this.applyDarkMode(dark)
    await auth.init()
    if (this.isLoggedIn) {
      await this.loadCarts()
      this.currentView = 'main'
      this.getPageUrl()
    }
  },

  methods: {
    async getDarkMode() {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get('darkMode')
        return result.darkMode === true
      }
      return localStorage.getItem('darkMode') === 'true'
    },
    applyDarkMode(on) {
      document.body.classList.toggle('dark-mode', on)
      document.documentElement.setAttribute('data-bs-theme', on ? 'dark' : 'light')
    },
    getPageUrl() {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          this.pageUrl = tabs[0]?.url ?? ''
        })
      }
    },
    async loadCarts() {
      this.cartsLoading = true
      try {
        const res = await api.get('/carts')
        this.carts = res.data.map(c => ({
          ...c,
          items: c.items || [],
          labels: Array.isArray(c.labels) ? c.labels : [],
        }))
      } catch (err) {
        console.error('Failed to load carts', err)
      } finally {
        this.cartsLoading = false
      }
    },
    async onLoginSuccess() {
      await this.loadCarts()
      this.getPageUrl()
      this.currentView = 'main'
    },
    async handleLogout() {
      await auth.clear()
      this.carts = []
      this.currentView = 'login'
    },
    onItemAdded({ itemName, cart }) {
      this.successMessage = {
        title: 'Item added!',
        sub: `"${itemName}" was added to your cart.`,
        cart: cart.name,
      }
      this.currentView = 'success'
    },
    onImportDone({ cart, count }) {
      this.successMessage = {
        title: 'Cart imported!',
        sub: `${count} items were copied into your cart.`,
        cart: cart.name,
      }
      this.currentView = 'success'
    },
  },
}
</script>

<style>
body {
  width: 390px;
  min-height: 480px;
  margin: 0;
  overflow-x: hidden;
}
.extension-popup {
  width: 390px;
  min-height: 480px;
  display: flex;
  flex-direction: column;
}
.dark-mode { background-color: #121212 !important; color: #ffffff !important; }
.dark-mode .list-group-item { background-color: #1e1e1e; color: #ffffff; }
.dark-mode .modal-content   { background-color: #212529; color: #fff; }
.dark-mode .modal-header,
.dark-mode .modal-footer     { border-color: #444; }
.dark-mode .card             { background-color: #1e1e1e; border-color: #444; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,   .fade-leave-to     { opacity: 0; }
</style>