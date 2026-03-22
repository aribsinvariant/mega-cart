<template>
  <Navbar 
    ref="navbar"
    :is-dark="isDarkMode"
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
    @share-cart-link="shareWithLink"
    @update-inbox="updateInboxCount"
    @delete-cart="deleteCart"
    @remove-shared-cart="removeSharedCart"

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
  .dark-mode .comment__text { 
    color: #ffffff !important; 
  }
  .dark-mode .comment__author { 
    color: #ffffff !important; 
  }
  .dark-mode .comment__time { 
    color: #9ca3af !important; 
  }
  .dark-mode .comment-section__title { 
    color: #ffffff !important; 
  }
  .dark-mode .comment-form__input { 
    color: #ffffff !important; 
  }
  .dark-mode .comment-section__count { 
    color: #9ca3af !important; 
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
      isDarkMode: localStorage.getItem("darkMode") === "true",
    };
  },

  computed: {
    selectedCart() {
      return this.carts.find((c) => c.id === this.selectedCartId) || null;
    },
  },

  async mounted() {
    const savedDark = localStorage.getItem("darkMode");
    this.isDarkMode = savedDark === "true";
    this.toggleDarkMode(this.isDarkMode);
    // If /carts requires auth, this might fail until logged in — that’s fine.
    await this.loadCarts();
  },

  methods: {
    async updateInboxCount() {
      if (this.$refs.navbar) {
      await this.$refs.navbar.getInboxCount();
    }
    },
    parseLabels(labels) {
      if (Array.isArray(labels)) return labels;
      if (typeof labels === 'string') {
        try { return JSON.parse(labels); } catch { return []; }
      }
      return [];
    },

    normalizeCart(c) {
      return { ...c, items: c.items || [], labels: this.parseLabels(c.labels) };
    },

    async addTagToCart({ cart, tagName }) {
      const trimmed = (tagName || "").trim();
      if (!trimmed) return;

      try {
        const full = (await api.get(`/carts/${cart.id}`)).data;
        const existingLabels = this.parseLabels(full.labels);

        await api.put(`/carts/${cart.id}`, {
          name: full.name,
          description: full.description ?? null,
          items: full.items || [],
          labels: [...new Set([...existingLabels, trimmed])],
        });

        // refresh and normalize
        const refreshed = (await api.get(`/carts/${cart.id}`)).data;
        this.carts = this.carts.map((c) => (c.id === cart.id ? this.normalizeCart(refreshed) : c));
      } catch (err) {
        console.error("Add tag failed:", err?.response?.status, err?.response?.data);
        alert("Failed to add tag");
      }
    },

    async loadCarts() {
      try {
        const res = await api.get("/carts");
        this.carts = res.data.map((c) => this.normalizeCart(c));
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

        this.carts = this.carts.map((c) => (c.id === fullCart.id ? this.normalizeCart(fullCart) : c));

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
        this.carts = this.carts.map((c) => (c.id === cartId ? this.normalizeCart(refreshed.data) : c));
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
      this.isDarkMode = !!isDark;
      localStorage.setItem("darkMode", this.isDarkMode);
      if (isDark) {
        document.body.classList.add('dark-mode');
        document.documentElement.setAttribute("data-bs-theme", "dark");
      } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.setAttribute("data-bs-theme", "light");
      }
    },
    async editCart({ cart, newName, newColor }) {
      const full = (await api.get(`/carts/${cart.id}`)).data;

      try {
        await api.put(`/carts/${cart.id}`, {
          name: newName,
          description: newColor ?? null,
          items: full.items || [],
          labels: full.labels || [],
        });

        // refresh
        const res= await api.get(`/carts/${cart.id}`);
        this.carts = this.carts.map((c) => (c.id === cart.id ? this.normalizeCart(res.data) : c));
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
          canEdit: !viewOnly,
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
        const fullCart = await api.get(`/carts/${cart.id}`);
        const items = fullCart.data.items.map(({ name, description, price, quantity }) => ({
          name,
          description,
          price,
          quantity,
        }));

        const res = await api.post("/carts", {
          name: cart.name,
          description: cart.description,
          items,
          labels: cart.labels,
        });

        this.carts.unshift({
          id: res.data.cartId,
          name: cart.name,
          description: cart.description,
          items: cart.items,
          labels: this.parseLabels(cart.labels)
        });

        // go to carts page after creating
        this.$router.push({ name: "carts" });
      } catch (err) {
        console.error("Create cart failed:", err?.response?.status, err?.response?.data);
        alert(`Failed to create cart (${err?.response?.status || "no status"})`);
      }
    },
    async shareWithLink(cart) {
      try {
        const res = await api.post(`/carts/${cart.id}/share-link`);
        const token = res.data.token;
        const link = `${window.location.origin}/carts/shared/${token}`;
        await navigator.clipboard.writeText(link);
        alert("Link copied to clipboard!");
      } catch (err) {
        console.error("Share with link failed:", err?.response?.status, err?.response?.data);
        alert(`Failed to create shareable link (${err?.response?.status || "no status"})`);
      }
    },
    async deleteCart(cart){
      if (!confirm("Are you sure you want to delete this cart? This action cannot be undone.")) {
        return;
      }

      try {
        await api.delete(`/carts/${cart.id}`);
        this.carts = this.carts.filter((c) => c.id !== cart.id);
        if (this.selectedCartId === cart.id) {
          this.selectedCartId = null;
          this.$router.push({ name: "carts" });
        }
      } catch (err) {
        console.error("Delete cart failed:", err?.response?.status, err?.response?.data);
        alert(`Failed to delete cart (${err?.response?.status || "no status"})`);
      }
    },
    async removeSharedCart(cart) {
      if (!confirm("Are you sure you want to remove this shared cart? This will revoke your access to it.")) {
        return;
      }

      try {
        await api.delete(`/carts/shared/${cart.id}`);
        this.carts = this.carts.filter((c) => c.id !== cart.id);
      } catch (err) {
        console.error("Remove shared cart failed:", err?.response?.status, err?.response?.data);
        alert(`Failed to remove shared cart (${err?.response?.status || "no status"})`);
      }
    }
  }
};
</script>