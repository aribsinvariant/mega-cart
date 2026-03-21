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
        <div class="d-flex justify-content-between align-items-center">

          <div>
            <div class="d-flex align-items-center gap-2">
              <div
                class="fw-bold item-link"
                @click="openLink(item.description)"
              >
                {{ item.name }}
              </div>

              <span
                v-if="cart?.can_edit"
                class="edit-btn"
                title="Edit"
                @click="openEditModal(item)"
              >
                ✏️
              </span>
            </div>

            <div class="text-muted">
              ${{ item.price.toFixed(2) }} × {{ item.quantity }}
            </div>
          </div>

          <div class="d-flex align-items-center gap-2">

            <button
              v-if="cart?.can_edit"
              class="btn btn-outline-secondary btn-sm"
              @click="changeQuantity(item, -1)"
            >
              −
            </button>

            <span v-if="!cart?.can_edit">{{ $t("cart_details.quantity") }}: {{ item.quantity }}</span>
            <span v-if="cart?.can_edit">{{ item.quantity }}</span>

            <button
              v-if="cart?.can_edit"
              class="btn btn-outline-secondary btn-sm"
              @click="changeQuantity(item, 1)"
            >
              +
            </button>

            <span class="ms-3 fw-bold">
              ${{ (item.price).toFixed(2) }}
            </span>

            <button
              class="btn btn-close ms-3"
              v-if="cart?.can_edit"
              @click="removeItem(item)"
            ></button>

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
            <h5 class="modal-title">{{ $t("cart_details.add_item_modal_title") }}</h5>
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
              <label class="form-label" for="link">{{ $t("cart_details.link") }}</label>
              <input
                id="link"
                class="form-control"
                v-model.trim="newItemLink"
                :placeholder="'e.g. http://example.com/product'"
                required
                maxlength="1024"
                ref="itemLinkInput"
              />
              <label class="form-label" for="price">{{ $t("cart_details.price") }}</label>
              <input
                id="price"
                class="form-control"
                v-model.trim="newItemPrice"
                :placeholder="'e.g. 1.99'"
                required
                type="number"
                step="0.01"
                min="0"
              />
              <label class="form-label" for="quantity">{{ $t("cart_details.quantity") }}</label>
              <input
                id="quantity"
                class="form-control"
                v-model.trim="newItemQuantity"
                :placeholder="'e.g. 1'"
                required
                type="number"
                step="1"
                min="1"
                default="1"
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

    <div
      v-if="showEditModal"
      class="modal fade show"
      tabindex="-1"
      style="display: block;"
      role="dialog"
      aria-modal="true"
      @click.self="closeEditModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ $t("cart_details.edit_item") }}</h5>
            <button type="button" class="btn-close" @click="closeEditModal"></button>
          </div>

          <form @submit.prevent="modifyItem()">
            <div class="modal-body">
              <label class="form-label" for="itemName">{{ $t("cart_details.item_name") }}</label>
              <input
                id="itemName"
                class="form-control"
                v-model.trim="editItemName"
                :placeholder="$t('cart_details.eg_milk')"
                required
                maxlength="40"
                ref="itemNameInput"
              />
              <label class="form-label" for="link">{{ $t("cart_details.link") }}</label>
              <input
                id="link"
                class="form-control"
                v-model.trim="editItemLink"
                :placeholder="'e.g. http://example.com/product'"
                required
                maxlength="1024"
                ref="itemLinkInput"
              />
              <label class="form-label" for="price">{{ $t("cart_details.price") }}</label>
              <input
                id="price"
                class="form-control"
                v-model.trim="editItemPrice"
                :placeholder="'e.g. 1.99'"
                required
                type="number"
                step="0.01"
                min="0"
              />
              <label class="form-label" for="quantity">{{ $t("cart_details.quantity") }}</label>
              <input
                id="quantity"
                class="form-control"
                v-model.trim="editItemQuantity"
                :placeholder="'e.g. 1'"
                required
                type="number"
                step="1"
                min="1"
                default="1"
              />
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" @click="closeEditModal">
                {{ $t("cart_details.cancel") }}
              </button>
              <button class="btn btn-primary" type="submit" :disabled="editItemName.length === 0">
                {{ $t("cart_details.confirm") }}
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
      showEditModal: false,
      editingItem: null,
      editItemName: "",
      editItemLink: "",
      editItemPrice: "",
      editItemQuantity: "1",
      newItemName: "",
      newItemLink: "",
      newItemPrice: "",
      newItemQuantity: "1",
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
    async changeQuantity(item, change) {
      if (!this.cart?.can_edit) return;

      const newQuantity = item.quantity + change;
      if (newQuantity < 1) return;

      const updatedItems = this.cart.items.map(i =>
        i === item ? { ...i, quantity: newQuantity } : i
      );

      await api.put(`/carts/${this.id}`, {
        name: this.cart.name,
        description: this.cart.description ?? null,
        items: updatedItems,
      });

      this.getCart();
    },
    async modifyItem() {
      if (!this.cart?.can_edit) return;

      const updatedItems = this.cart.items.map(i =>
        i === this.editingItem
          ? {
              ...i,
              name: this.editItemName,
              description: this.editItemLink,
              price: parseFloat(this.editItemPrice),
              quantity: parseInt(this.editItemQuantity)
            }
          : i
      );

      await api.put(`/carts/${this.id}`, {
        name: this.cart.name,
        description: this.cart.description ?? null,
        items: updatedItems,
      });

      await this.getCart();
      this.closeEditModal();
    },
    openEditModal(item) {
      if (!this.cart?.can_edit) return;
      
      this.editingItem = item;
      
      this.editItemName = item.name;
      this.editItemLink = item.description;
      this.editItemPrice = item.price;
      this.editItemQuantity = item.quantity;
      
      this.showEditModal = true;
    },
    closeEditModal() {
      this.showEditModal = false;
      this.editingItem = null;
      
      this.editItemName = "";
      this.editItemLink = "";
      this.editItemPrice = "";
      this.editItemQuantity = "1";
    },
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
    openModal() {
      if (!this.cart?.can_edit) return;
      this.showModal = true;
      this.newItemName = "";
      this.newItemLink = "";
      this.newItemPrice = "";
      this.newItemQuantity = "1";

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
      const itemLink = (this.newItemLink || "").trim();
      const itemPrice = parseFloat(this.newItemPrice);
      const itemQuantity = parseInt(this.newItemQuantity);
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
          { name: itemName, description: itemLink || null, price: itemPrice ?? 0, quantity: itemQuantity ?? 1 },
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
<style scoped>
  .item-link {
    cursor: pointer;
  }

  .item-link:hover {
    text-decoration: underline;
  }

  .edit-btn {
    background: none !important;
    border: none !important;
    cursor: pointer !important;
    color: #aaa !important;
    font-size: 13px !important;
    padding: 2px 5px !important;
    border-radius: 4px !important;
    filter: grayscale(100%) !important;
  }

  .edit-btn:hover {
    color: #666 !important;
    background-color: #f0f0f0 !important;
  }
</style>