<template>
  <component
    :is="page.component"
    @signup-success="$emit('signup-success')"
    @login-success="$emit('login-success')"
    :cart="selectedCart"
    @cart-selected="$emit('cart-selected', $event)"
    @back="$emit('back')"
  />
</template>

<script>
import HomePage from "./HomePage.vue";
import SignUpPage from "./SignUpPage.vue";
import LogInPage from "./LogInPage.vue";
import CartPage from "./CartPage.vue";
import CartDetailsPage from "./CartDetails.vue";

export default {
  props: ["page", "selectedCart"],
  components: { HomePage, SignUpPage, LogInPage, CartPage, CartDetailsPage },
};
</script>