<template>
  <nav class="navbar navbar-expand navbar-dark bg-dark px-3">
    <div class = "container-fluid">

      <!-- clicking on the logo brings you home -->
      <router-link class="navbar-brand d-flex align-items-center" to="/">
        <img
          src="/Logo.png"
          alt="Mega Cart"
          height="40"
          class="me-2"
        />
      </router-link>


      <ul class="navbar-nav align-items-center me-auto">
        <!-- can add the same for shared carts -->
        <li v-if="isLoggedIn" class="nav-item p-2">
          <router-link class="nav-link" to="/carts">{{ $t("nav.carts") }}</router-link>
        </li>
      </ul>

      <ul class="navbar-nav d-flex align-items-center ms-auto">
        <!-- doesnt show if logged in -->
        <template v-if="!isLoggedIn">
          <li class="nav-item p-2">
            <router-link class="nav-link" to="/login">{{ $t("nav.log_in") }}</router-link>
          </li>
          <li class="nav-item p-2">
            <router-link class="nav-link" to="/signup">{{ $t("nav.sign_up") }}</router-link>
          </li>
        </template>

        <li class="nav-item dropdown me-2">
          <button
            class="btn btn-outline-light btn-sm dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
          >
            {{ $t("nav.language") }}
          </button>

          <ul class="dropdown-menu dropdown-menu-end">
            <li v-for="l in languages" :key="l.code">
              <button class="dropdown-item" @click="setLanguage(l.code)">
                {{ l.label }}
              </button>
            </li>
          </ul>
        </li>
        <li class = "nav-item dropdown">
          <button class="btn btn-outline-light btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
            {{ $t("nav.settings") }}
          </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li v-if="isLoggedIn">
                <button class="dropdown-item" @click="logout">
                  {{ $t("nav.log_out") }}
                </button>
              </li>
              <li>
                <button class="dropdown-item" @click="toggleDarkMode">
                  {{ $t("nav.toggle_dark_mode") }}
                </button>
              </li>
              <li>
                <router-link class="dropdown-item" :to="{ name: 'settings' }">
                  {{ $t("nav.language") }}
                </router-link>
              </li>
            </ul>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script>
import { isLoggedIn, auth } from "../logged/auth";

export default {
  name: "Navbar",
  props: {
    isDark: {
      type: Boolean,
      required: true,
    },
  },
  watch: {
    isDark(newVal) {
      this.toggleTheme = newVal;
    },
  },
  data() {
    return {
      toggleTheme: this.isDark,
      languages: [
        { code: "en", label: "English" },
        { code: "ar", label: "العربية" },
        { code: "es", label: "Español" },
        { code: "fr", label: "Français" },
        { code: "hi", label: "हिन्दी" },
        { code: "zh", label: "中文" },
      ],
    };
  },
  computed: {
    isLoggedIn() {
      return isLoggedIn.value;
    },
  },
  methods: {
    logout() {
      auth.clear();
      this.$router.push({ name: "login" });
    },
    toggleDarkMode() {
      this.toggleTheme = !this.toggleTheme;
      this.$emit("theme", this.toggleTheme);
    },
    setLanguage(lang) {
      this.$i18n.locale = lang;
      localStorage.setItem("lang", lang);
    },
  },
};
</script>