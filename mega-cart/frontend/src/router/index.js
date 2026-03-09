import { createRouter, createWebHistory } from "vue-router";

import HomePage from "../components/HomePage.vue";
import LogInPage from "../components/LogInPage.vue";
import SignUpPage from "../components/SignUpPage.vue";
import CartPage from "../components/CartPage.vue";
import CartDetails from "../components/CartDetails.vue";
import RecoverPage from "@/components/RecoverPage.vue";
import ResetPage from "@/components/ResetPage.vue";
import SharedCartLink from "@/components/SharedCartLink.vue";
import SharedCartInbox from "@/components/SharedCartInbox.vue";
import SharedCartPage from "@/components/SharedCartPage.vue";
import AccountSettings from "@/components/AccountSettings.vue";
import SecuritySettings from "@/components/SecuritySettings.vue";

const routes = [
  { path: "/", name: "home", component: HomePage },
  { path: "/login", name: "login", component: LogInPage },
  { path: "/signup", name: "signup", component: SignUpPage },
  { path: "/login/recovery", name: "passwordRecovery", component: RecoverPage },
  { path: "/login/reset", name: "passwordReset", component: ResetPage },
  { path: "/carts/shared/:token", name: "sharedCartLink", component: SharedCartLink, props: true },


  // after logging in
  { path: "/carts", name: "carts", component: CartPage, meta: { requiresAuth: true } },
  {
    path: "/carts/:id",
    name: "cartDetails",
    component: CartDetails,
    meta: { requiresAuth: true },
    props: true,
  },
  { path: "/carts/shared", name: "sharedCartView", component: SharedCartPage, meta: { requiresAuth: true }, props: true },
  { path: "/carts/shared/inbox", name: "inbox", component: SharedCartInbox, meta: { requiresAuth: true } },
  { path: "/account/settings", name: "accountSettings", component: AccountSettings, meta: { requiresAuth: true } },
  { path: "/account/settings/security", name: "securitySettings", component: SecuritySettings, meta: { requiresAuth: true } }
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