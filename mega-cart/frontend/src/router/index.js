import { createRouter, createWebHistory } from "vue-router";

import HomePage from "../components/HomePage.vue";
import LogInPage from "../components/LogInPage.vue";
import SignUpPage from "../components/SignUpPage.vue";
import CartPage from "../components/CartPage.vue";
import CartDetails from "../components/CartDetails.vue";

const routes = [
  { path: "/", name: "home", component: HomePage },
  { path: "/login", name: "login", component: LogInPage },
  { path: "/signup", name: "signup", component: SignUpPage },

  // after logging in
  { path: "/carts", name: "carts", component: CartPage, meta: { requiresAuth: true } },
  {
    path: "/carts/:id",
    name: "cartDetails",
    component: CartDetails,
    meta: { requiresAuth: true },
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const isLoggedIn = !!localStorage.getItem("token");
  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: "login" };
  }
});

export default router;