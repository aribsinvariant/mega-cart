<template>
  <Navbar 
    @theme="toggleDarkMode"
  />
  <router-view
    :carts="carts"
    :selected-cart="selectedCart"
    @signup-success="goLogin"
    @login-success="goHome"
    @create-cart="createCart"
    @add-item="addItemToCart"
    @add-tag="addTagToCart"
    @edit-cart="editCart"
    @share-cart="shareCart"
    @duplicate-cart="duplicateCart"
  />
</template>

<style>
  .dark-mode {
    background-color: #121212 !important;
    color: #ffffff !important;
  }
  .dark-mode .modal{
    background-color: #121212 !important;
    color: #ffffff !important;
  }
  .dark-mode .list-group-item {
    background-color: #1e1e1e;
    color: #ffffff;
  }
  .dark-mode .modal-content {
    background-color: #212529;
    color: #fff;
  }
  .dark-mode .modal-header,
  .dark-mode .modal-footer {
    border-color: #444;
  }
  .dark-mode .modal {
    background: rgba(255, 255, 255, 0.1) !important;
  }
  .modal {
    background: rgba(0, 0, 0, 0.5);
  }
</style>

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
          description: null,
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
    toggleDarkMode(isDark) {
      if (isDark) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    },
    async editCart({ cart, newName, newColor }) {
      const full = (await api.get(`/carts/${cart.id}`)).data;

      try {
        await api.put(`/carts/${cart.id}`, {
          name: newName,
          description: newColor ?? null,
          items: full.items || [],
          tags: full.tags || [],
        });

        // refresh
        const res= await api.get(`/carts/${cart.id}`);
        this.carts = this.carts.map((c) => (c.id === cart.id ? res.data : c));
        this.$router.push({ name: "carts" });
      } catch (err) {
        console.error("Edit cart failed:", err?.response?.status, err?.response?.data);
        alert("Failed to edit cart");
      }
    },
    async shareCart({ cart, email, viewOnly }) {
      const trimmedEmail = (email || "").trim();
      if (!trimmedEmail) return;

      try {
        // 1) email -> userId (AUTH service)
        // If your api instance already points to the gateway, this path must route to auth-service.
        const lookup = await api.get("/auth/users/by-email", {
          params: { email: trimmedEmail },
        });

        const userId = lookup.data.userId;
        if (!userId) {
          alert("Unable to share cart");
          return;
        }

        // 2) share cart (CART service)
        await api.post(`/carts/${cart.id}/share`, {
          userId,
          //viewOnly: !!viewOnly,
        });

        alert("Cart shared successfully");
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          `Failed to share cart (${err?.response?.status || "no status"})`;
        console.error("Share cart failed:", err?.response?.status, err?.response?.data);
        alert(msg);
      }
    },
    async duplicateCart(cart){
      try {
        const res = await api.post("/carts", {
          name: cart.name,
          description: cart.description,
          items: cart.items,
          tags: cart.tags,
        });

        this.carts.unshift({
          id: res.data.cartId,
          name: cart.name,
          description: cart.description,
          items: cart.items,
          tags: cart.tags
        });

        // go to carts page after creating
        this.$router.push({ name: "carts" });
      } catch (err) {
        console.error("Create cart failed:", err?.response?.status, err?.response?.data);
        alert(`Failed to create cart (${err?.response?.status || "no status"})`);
      }
    }
  }
};
</script>