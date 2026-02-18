import { reactive, computed } from "vue";

export const auth = reactive({
  token: localStorage.getItem("token"),

  setToken(t) {
    this.token = t;
    localStorage.setItem("token", t);
  },

  clear() {
    this.token = null;
    localStorage.removeItem("token");
  },
});

export const isLoggedIn = computed(() => !!auth.token);