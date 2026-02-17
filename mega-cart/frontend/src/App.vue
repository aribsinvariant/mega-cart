<template>
  <Navbar />
  <router-view
    :carts="carts"
    :selected-cart="selectedCart"
    @signup-success="goLogin"
    @login-success="goHome"
    @create-cart="createCart"
    @add-item="addItemToCart"
    @add-tag="addTagToCart"
  />
</template>

<script>
import Navbar from './components/Navbar.vue';

import { api } from "./api";

export default {
  components: { Navbar },

  data() {
    return {
      selectedCartId: null,
      carts: [],
      currentUser: null,
    };
  },

  computed: {
    selectedCart() {
      return this.carts.find((c) => c.id === this.selectedCartId) || null;
    },
  },

  async mounted() {
    // If /carts requires auth, this might fail until logged in — that’s fine.
    await this.loadCarts();
  },

  methods: {
    async addTagToCart({ cart, tagName }) {
      const trimmed = (tagName || "").trim();
      if (!trimmed) return;

      try {
        const full = (await api.get(`/carts/${cart.id}`)).data;

        await api.put(`/carts/${cart.id}`, {
        name: full.name,
        description: full.description ?? null,
        items: full.items || [],          
        tags: [...new Set([...(full.tags || []), trimmed])],                  
        });

        // refresh
        const refreshed = await api.get(`/carts/${cart.id}`);
        this.carts = this.carts.map((c) => (c.id === cart.id ? refreshed.data : c));
      } catch (err) {
        console.error("Add tag failed:", err?.response?.status, err?.response?.data);
        alert("Failed to add tag");
      }
    },

    async loadCarts() {
      try {
        const res = await api.get("/carts");
        this.carts = res.data.map((c) => ({ ...c, items: c.items || [] }));
      } catch (err) {
        console.error(err);
      }
    },

    async createCart(name) {
      const trimmed = (name || "").trim();
      if (!trimmed) return;

      try {
        const res = await api.post("/carts", {
          name: trimmed,
          description: "no description",
          items: [],
        });

        this.carts.unshift({
          id: res.data.cartId,
          name: trimmed,
          description: null,
          items: [],
        });

        // go to carts page after creating
        this.$router.push({ name: "carts" });
      } catch (err) {
        console.error("Create cart failed:", err?.response?.status, err?.response?.data);
        alert(`Failed to create cart (${err?.response?.status || "no status"})`);
      }
    },

    async openCart(cart) {
      this.selectedCartId = cart.id;

      try {
        const res = await api.get(`/carts/${cart.id}`);
        const fullCart = res.data;

        this.carts = this.carts.map((c) => (c.id === fullCart.id ? fullCart : c));

        // ✅ route to cart details
        this.$router.push({ name: "cartDetails", params: { id: cart.id } });
      } catch (err) {
        console.error(err);
        alert("Failed to load cart details");
      }
    },

    async addItemToCart({ cartId, itemName }) {
      const trimmed = (itemName || "").trim();
      if (!trimmed) return;

      const cart = this.carts.find((c) => c.id === cartId);
      if (!cart) return;

      const full = (await api.get(`/carts/${cartId}`)).data;
      const existing = Array.isArray(full.items) ? full.items : [];

      const normalizedExisting = existing.map((i) => {
        if (typeof i === "string") return { name: i, description: null, price: 0, quantity: 1 };
        return {
          name: i.name,
          description: i.description ?? null,
          price: i.price ?? 0,
          quantity: i.quantity ?? 1,
        };
      });

      const payload = {
        name: cart.name,
        description: cart.description ?? null,
        items: [...normalizedExisting, { name: trimmed, description: null, price: 0, quantity: 1 }],
      };

      try {
        await api.put(`/carts/${cartId}`, payload);
        const refreshed = await api.get(`/carts/${cartId}`);
        this.carts = this.carts.map((c) => (c.id === cartId ? refreshed.data : c));
      } catch (err) {
        console.error("Add item failed:", err?.response?.status, err?.response?.data);
        alert("Failed to add item");
      }
    },

    // ✅ router versions of your “goX” functions
    goLogin() {
      this.$router.push({ name: "login" });
    },
    goHome() {
      // after login you probably want carts instead of home — up to you
      this.$router.push({ name: "carts" });
      // optional: refresh carts after login
      this.loadCarts();
    },
    goToCarts() {
      this.selectedCartId = null;
      this.$router.push({ name: "carts" });
    },
  },
};
</script>