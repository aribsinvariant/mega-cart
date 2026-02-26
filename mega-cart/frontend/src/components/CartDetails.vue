<template>
  <div class="container py-4">
    <button class="btn btn-link mb-3" @click="goBack">
      {{ $t("cart_details.back_to_carts") }}
    </button>

    <h1 v-if="cart">{{ cart.name }}</h1>
    <p align="right" class="mb-0" v-if="cart?.can_edit">
        <button class="btn btn-primary" type="button" @click="openModal">
            {{ $t("cart_details.add_item") }}
        </button>
    </p>

    <p v-if="cart && cart.items.length === 0" class="mt-3">
      {{ $t("cart_details.this_cart_is_empty") }}
    </p>

    <ul v-if="cart && cart.items.length > 0" class="list-group mt-3">
      <li v-for="(item, i) in cart.items" :key="i" class="list-group-item">
        <div class="d-flex justify-content-between bd-highlight mb-3">
          <div class="p-2 bd-highlight">{{ item.name }}</div>
          <div class="p-2 bd-highlight">
            <button class="btn btn-close ms-auto" v-if="cart?.can_edit" @click="removeItem(item)"></button>
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
            <h5 class="modal-title">{{ $t("cart_details.item_name") }}</h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>

          <form @submit.prevent="addItems">
            <div class="modal-body">
              <label class="form-label" for="itemName">{{ $t("cart_details.item_name") }}</label>
              <input
                id="itemName"
                class="form-control"
                v-model.trim="newItemName"
                :placeholder="$t('cart_details.eg_milk')"
                required
                maxlength="40"
                ref="itemNameInput"
              />
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" @click="closeModal">
                {{ $t("cart_details.cancel") }}
              </button>
              <button class="btn btn-primary" type="submit" :disabled="newItemName.length === 0">
                {{ $t("cart_details.add_item") }}
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
      if (!this.cart?.can_edit) return;
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
      if (!this.cart?.can_edit) return;
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
    goBack() {
      const from = this.$route.query.from || "carts";
      const filter = this.$route.query.filter || "all";
      if (from === "shared") {
        this.$router.push({ name: "sharedCartView", query: { filter } });
      } else {
        this.$router.push({ name: "carts" });
      }
    },
    
    removeItem(item){
      if (!this.cart?.can_edit) return;
      const existing = Array.isArray(this.cart.items) ? this.cart.items : [];
      const filtered = existing.filter(i => i !== item);
      api.put(`/carts/${this.id}`, {
        name: this.cart.name,
        description: this.cart.description ?? null,
        items: filtered.map(i => typeof i === "string" ? { name: i, description: null, price: 0, quantity: 1 } : i),
      }).then(() => {
        this.getCart();
      });
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