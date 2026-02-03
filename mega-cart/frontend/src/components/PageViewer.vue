<template>
  <component
    :is="page.component"
    @signup-success="$emit('signup-success')"
    @login-success="$emit('login-success')"
    :carts="carts"
    :cart="selectedCart"
    @cart-selected="$emit('cart-selected', $event)"
    @back="$emit('back')"
    @create-cart="$emit('create-cart', $event)"
    @add-item="$emit('add-item', $event)"
    @add-tag="$emit('add-tag', $event)"
  />
</template>

<script>
import HomePage from "./HomePage.vue";
import SignUpPage from "./SignUpPage.vue";
import LogInPage from "./LogInPage.vue";
import CartPage from "./CartPage.vue";
import CartDetailsPage from "./CartDetails.vue";

export default {
  props: ["page", "selectedCart", "carts"],
  components: { HomePage, SignUpPage, LogInPage, CartPage, CartDetailsPage },
  emits: ["signup-success", "login-success", "cart-selected", "back", "create-cart", "add-item", "add-tag"]
};
</script>