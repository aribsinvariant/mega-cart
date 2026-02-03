<template>
    <navbar
        :pages="pages"
        :active-page="activePage"
        :nav-link-click="(index) => activePage = index"
    ></navbar>
    
    <page-viewer
        :page="pages[activePage]"
        @signup-success="goLogin"
        @login-success="goHome"
        :carts="carts"
        :selected-cart="selectedCart"
        @cart-selected="openCart"
        @back="goToCarts"
        @create-cart="createCart"
        @add-item="addItemToCart"
        @add-tag="addTagToCart"
    />
</template>

<script>
import Navbar from './components/Navbar.vue';
import PageViewer from './components/PageViewer.vue';

import { api } from "./api";

export default {
    components: {
        Navbar,
        PageViewer
    },
    data() {
        return {
            activePage: 0,
            selectedCartId: null,
            carts: [],
            currentUser: null,
            pages: [
                {
                    link: { text: "Home", url: "index.html" },
                    component: "HomePage",
                    visible: true
                },
                {
                    link: { text: "Sign up", url: "signup.html" },
                    component: "SignUpPage",
                    visible: true
                },
                {
                    link: { text: "Log in", url: "login.html" },
                    component: "LogInPage",
                    visible: true
                },
                {
                    link: { text: "Carts", url: "cart.html" },
                    component: "CartPage",
                    visible: true
                },
                {
                    link: { text: "Cart Details", url: "cart-details.html" },
                    component: "CartDetailsPage",
                    visible: false
                },
            ]
        };
    },
    computed: {
        selectedCart(){
            return this.carts.find( c => c.id === this.selectedCartId) || null;
        }
    },
    async mounted() {
        await this.loadCarts();
    },
    methods: {
        async addTagToCart({cart, tagName}) {
            const trimmed = (tagName || "").trim();
            if (!trimmed) return;

            try {
                await api.put(`/carts/${cart.id}`, { name: cart.name, description: cart.description ?? null, items: cart.items, tags: [trimmed] });
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
                // IMPORTANT: your backend POST /carts currently expects items sometimes.
                // If you updated backend to `items = []` default, this works.
                const res = await api.post("/carts", {
                    name: trimmed,
                    description: 'no description',
                    items: [], // safe even if backend expects it
                });

                // Your backend currently returns { message, cartId }
                // So we add to list using what we know:
                this.carts.unshift({
                    id: res.data.cartId,
                    name: trimmed,
                    description: null,
                    items: [],
                });
            } catch (err) {
                console.error("Create cart failed:");
                console.error("status:", err?.response?.status);
                console.error("data:", err?.response?.data);
                console.error("url:", err?.config?.baseURL + err?.config?.url);
                alert(`Failed to create cart (${err?.response?.status || "no status"})`);
            }
        },
        async openCart(cart) {
            this.selectedCartId = cart.id;
            this.activePage = 4;

            try {
            const res = await api.get(`/carts/${cart.id}`);
            const fullCart = res.data; // includes items

            // replace in carts array
            this.carts = this.carts.map((c) => (c.id === fullCart.id ? fullCart : c));
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

  const existing = Array.isArray(cart.items) ? cart.items : [];

  // ✅ normalize existing items to objects
  const normalizedExisting = existing.map((i) => {
    if (typeof i === "string") {
      return { name: i, description: null, price: 0, quantity: 1 };
    }
    return {
      name: i.name,
      description: i.description ?? null,
      price: i.price ?? 0,
      quantity: i.quantity ?? 1,
    };
  });

  const payload = {
    name: cart.name,                       // keep cart name
    description: cart.description ?? null,
    items: [
      ...normalizedExisting,
      { name: trimmed, description: null, price: 0, quantity: 1 },
    ],
  };

  try {
    await api.put(`/carts/${cartId}`, payload);

    // refresh cart details so UI matches DB
    const refreshed = await api.get(`/carts/${cartId}`);
    this.carts = this.carts.map((c) => (c.id === cartId ? refreshed.data : c));
  } catch (err) {
    console.error("Add item failed:", err?.response?.status, err?.response?.data);
    alert("Failed to add item");
  }
  },
        goLogin() {
            alert("Redirecting to login page...");
            this.activePage = 2;
        },
        goHome() {
            alert("Redirecting to home page...");
            this.activePage = 0;
        },
        goToCarts() {
            this.activePage = 3;
            this.selectedCartId = null;
        }
    }
}
</script>