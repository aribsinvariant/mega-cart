<template>
  <div class="container py-4">
    <h1>{{ cart?.name || "Shared Cart" }}</h1>
    <p v-if="!cart">...</p>

    <div v-else>
      <ul class="list-group mt-3">
        <li v-for="(item, i) in cart.items" :key="i" class="list-group-item">
          {{ item.name }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { api } from "../api";

export default {
  data() {
    return { cart: null };
  },
  async mounted() {
    const { token } = this.$route.params;
    const res = await api.get(`/carts/shared/${token}`); 
    this.cart = res.data;
  }
};
</script>