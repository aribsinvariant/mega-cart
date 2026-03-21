<template>
  <div class="container py-4">
    <h1>{{ cart?.name || "Shared Cart" }}</h1>
    <p v-if="cart && cart.items.length === 0" class="mt-3">
      {{ $t("cart_details.this_cart_is_empty") }}
    </p>

    <ul v-if="cart && cart.items.length > 0" class="list-group mt-3">
      <li v-for="(item, i) in cart.items" :key="i" class="list-group-item">
        <div class="d-flex justify-content-between align-items-center">

          <div>
            <div
              class="fw-bold item-link"
              @click="openLink(item.description)"
            >
              {{ item.name }}
            </div>

            <div class="text-muted">
              ${{ item.price.toFixed(2) }} × {{ item.quantity }}
            </div>
          </div>

          <div class="d-flex align-items-center gap-2">

            <span>{{ $t("cart_details.quantity") }}: {{ item.quantity }}</span>

            <span class="ms-3 fw-bold">
              ${{ item.price.toFixed(2) }}
            </span>

          </div>
        </div>
      </li>
    </ul>

    <ul v-if="cart && cart.items.length > 0" class="list-group mt-3">
      <li class="list-group-item d-flex justify-content-end" color="secondary">
        <span class="fw-bold">
          {{ $t("cart_details.total") }}: ${{ cart.items.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2) }}
        </span>
      </li>
    </ul>
    

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
  },
  methods: {
    openLink(link) {
      if (!link) return;

      if (!link.startsWith("http://") && !link.startsWith("https://")) {
        link = "https://" + link;
      }

      try {
        const url = new URL(link);
        window.open(url.href, "_blank");
      } catch {
        console.warn("Invalid URL:", link);
      }
    },
  }
};
</script>
<style scoped>
  .item-link {
    cursor: pointer;
  }

  .item-link:hover {
    text-decoration: underline;
  }
</style>