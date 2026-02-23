<template>
  <div class="container py-4">
    <button class="btn btn-link mb-3" @click="$router.push({ name: 'carts' })">
      ← Back to carts
    </button>

    <h1 v-if="cart">{{ cart.name }}</h1>
    <p align="right" class="mb-0">
        <button class="btn btn-primary" type="button" @click="openModal">
            + Add Item
        </button>
    </p>

    <p v-if="cart && cart.items.length === 0" class="mt-3">
      This cart is empty.
    </p>

    <ul v-if="cart && cart.items.length > 0" class="list-group mt-3">
      <li v-for="(item, i) in cart.items" :key="i" class="list-group-item">
        <div class="d-flex justify-content-between bd-highlight mb-3">
          <div class="p-2 bd-highlight">{{ item }}</div>
          <div class="p-2 bd-highlight">
            <button class="btn btn-close ms-auto" @click="removeItem(item)"></button>
          </div>
        </div>
      </li>
    </ul>
    <div
      v-if="showModal"
      class="modal fade show"
      tabindex="-1"
      style="display: block;"
      role="dialog"
      aria-modal="true"
      @click.self="closeModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add Item</h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>

          <form @submit.prevent="addItems">
            <div class="modal-body">
              <label class="form-label" for="itemName">Item name</label>
              <input
                id="itemName"
                class="form-control"
                v-model.trim="newItemName"
                placeholder="e.g. Milk"
                required
                maxlength="40"
                ref="itemNameInput"
              />
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" @click="closeModal">
                Cancel
              </button>
              <button class="btn btn-primary" type="submit" :disabled="newItemName.length === 0">
                Add Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <CommentSection
      :comments="cartComments"
      :current-user="currentUser"
      :loading="commentsLoading"
      :posting="commentsPosting"
      :error="commentsError"
      @post-comment="postComment"
    />
  </div>
</template>

<script>
import { api } from "../api";
import CommentSection from './CommentSection.vue'

export default {
  name: "CartDetailsPage",
  components: { CommentSection },
  props: {
    id: {
      type: String,
      required: true,
    }
  },
  
  data() {
    return {
      cart: null,
      loading: true,
      showModal: false,
      newItemName: "",
      cartComments: [],
      commentsLoading: false,
      commentsPosting: false,
      commentsError: null,
      isDarkMode: document.body.classList.contains('dark')
    };
  },

  mounted() {
    this.getCart();
    this.fetchComments()
    this.observer = new MutationObserver(() => {
    this.isDarkMode = document.body.classList.contains('dark-mode')
    })
    this.observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })

    console.log('isDarkMode on mount:', document.body.classList.contains('dark-mode'))
    console.log('body classes:', document.body.className)
  },

  beforeUnmount() {
    this.observer.disconnect()
  },

  methods: {
    openModal() {
      this.showModal = true;
      this.newItemName = "";

      this.$nextTick(() => {
        this.$refs.itemNameInput?.focus();
      });
    },
    closeModal() {
      this.showModal = false;
    },
    async addItems() {
      const itemName = (this.newItemName || "").trim();
      if (!itemName || !this.cart) return;

      const full = (await api.get(`/carts/${this.id}`)).data;
      const existing = Array.isArray(full.items) ? full.items : [];

      await api.put(`/carts/${this.id}`, {
        name: full.name,
        description: full.description ?? null,
        items: [
          ...existing.map(i =>
            typeof i === "string"
              ? { name: i, description: null, price: 0, quantity: 1 }
              : { name: i.name, description: i.description ?? null, price: i.price ?? 0, quantity: i.quantity ?? 1 }
          ),
          { name: itemName, description: null, price: 0, quantity: 1 },
        ],
      });

      await this.getCart();
      this.closeModal();
    },
    removeItem(item){
      return;
    },
    async getCart() {
      const res = await api.get(`/carts/${this.id}`);
      this.cart = { ...res.data, items: res.data.items || [] };
      this.loading = false;
    },
    async fetchComments() {
      this.commentsLoading = true
      try {
        const response = await api.get(`/carts/${this.id}/comments`)
        this.cartComments = response.data  // ← extract .data
      } catch (err) {
        this.commentsError = err.message
      } finally {
        this.commentsLoading = false
      }
    },

    async postComment(content) {
      this.commentsPosting = true
      try {
        const response = await api.post(`/carts/${this.id}/comments`, { content })
        this.cartComments.unshift(response.data)  // ← extract .data
      } catch (err) {
        this.commentsError = err.message
      } finally {
        this.commentsPosting = false
      }
    }
  },
  watch: {
    id() {
      this.getCart();
    },
  },
};
</script>