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
          <router-link class="nav-link" to="/carts">Carts</router-link>
        </li>
      </ul>

      <ul class="navbar-nav d-flex align-items-center ms-auto">
        <!-- doesnt show if logged in -->
        <template v-if="!isLoggedIn">
          <li class="nav-item p-2">
            <router-link class="nav-link" to="/login">Log in</router-link>
          </li>
          <li class="nav-item p-2">
            <router-link class="nav-link" to="/signup">Sign up</router-link>
          </li>
        </template>


        <li class = "nav-item dropdown">
          <button class="btn btn-outline-light btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
            Settings
          </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li v-if="isLoggedIn">
                <button class="dropdown-item" @click="logout">
                  Log out
                </button>
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
  },
};
</script>