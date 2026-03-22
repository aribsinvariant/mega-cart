<template>
  <div class="container py-4">
    <div class="d-flex align-items-center justify-content-between">
      <h1 class="mb-0">{{ $t("shared_cart.shared_carts") }}</h1>

      <select class="form-select w-auto" v-model="filter" @change="load">
        <option value="all">{{ $t("shared_cart.all_shared") }}</option>
        <option value="editable">{{ $t("shared_cart.editable_only") }}</option>
        <option value="viewonly">{{ $t("shared_cart.view_only") }}</option>
      </select>
    </div>

    <p v-if="carts.length === 0" class="text-muted mt-4">
      {{ $t("shared_cart.no_shared_carts") }}
    </p>

    <ul v-else class="list-group mt-4">
      <li
        v-for="cart in [...carts].sort((a, b) => a.id - b.id)"
        :key="cart.id"
        class="list-group-item d-flex justify-content-between align-items-center"
        :style="{ backgroundColor: cart.description || 'var(--bs-body-bg)', color: getContrastColor(cart.description) }"
      >
        <div class="d-flex align-items-center gap-2">
          <button
            class="btn btn-link p-0"
            @click="open(cart.id)"
            :style="{ color: cart.description ? getContrastColor(cart.description) : 'var(--bs-body-color)' }"
          >
            {{ cart.name }}
          </button>

          <small
            class="ms-2"
            :style="{ color: cart.description ? getContrastColor(cart.description) : 'var(--bs-body-color)' }"
          >
            • {{ cart.can_edit ? $t("shared_cart.editable") : $t("shared_cart.view_only") }}
          </small>
          <button 
            class="edit-btn" 
            title="remove" @click="removeSharedCart(cart)" 
            :style="{ color: cart.description ? getContrastColor(cart.description) : 'var(--bs-body-color)' }"
            >
              ❌
            </button>
        </div>

        <div class="d-flex gap-2 align-items-center">

          <button
            v-if="cart.can_edit"
            class="btn ms-auto"
            :style="cartButtonStyle(cart)"
            @mouseenter="e => e.target.style.backgroundColor = getContrastColor(cart.description) === '#000000' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'"
            @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
            @click="openTagModal(cart)"
          >
            {{ $t("shared_cart.add_tags") }}
        </button>

          <small :style="{ color: cart.description ? getContrastColor(cart.description) : 'var(--bs-body-color)' }">
            #{{ cart.id }}
          </small>
        </div>
      </li>
    </ul>

    <!-- Tag modal (same as your carts page) -->
    <div
      v-if="showTagModal"
      class="modal fade show"
      tabindex="-1"
      style="display: block;"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ $t("shared_cart.create_new_tag") }}</h5>
            <button type="button" class="btn-close" @click="closeTagModal"></button>
          </div>

          <form @submit.prevent.stop="createTag">
            <div class="modal-body">
              <label class="form-label" for="tagName">{{ $t("shared_cart.tag_name") }}</label>
              <input
                id="tagName"
                class="form-control"
                v-model.trim="newTagName"
                :placeholder="$t('shared_cart.eg_groceries')"
                required
                maxlength="255"
                ref="tagNameInput"
              />
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" @click="closeTagModal">
                {{ $t("shared_cart.cancel") }}
              </button>
              <button class="btn btn-primary" type="submit" :disabled="newTagName.length === 0">
                {{ $t("shared_cart.add") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div v-if="showTagModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<style scoped>
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

  .list-group-item .btn-outline-primary:hover {
    background-color: rgba(0, 0, 0, 0.1) !important;
    color: inherit !important;
    border-color: inherit !important;
  } 
</style>

<script>
import { api } from "../api";

export default {
  name: "SharedCarts",
  data() {
    return {
      carts: [],
      filter: "all",
      showTagModal: false,
      selectedCart: null,
      newTagName: "",
    };
  },
  async mounted() {
    const qFilter = this.$route.query.filter;
    if (qFilter === "all" || qFilter === "editable" || qFilter === "viewonly") {
        this.filter = qFilter;
    }
    await this.load();
  },
  methods: {
    async load() {
      let params = {};
      if (this.filter === "editable") params.editable = "true";
      if (this.filter === "viewonly") params.editable = "false";

      const res = await api.get("/carts/shared", { params });
      this.carts = res.data;
    },
    open(id) {
        this.$router.push({
            name: "cartDetails",
            params: { id },
            query: { from: "shared", filter: this.filter },
        });
    },

    openTagModal(cart) {

      if (!cart.can_edit) return;

      this.selectedCart = cart;
      this.newTagName = "";
      this.showTagModal = true;

      this.$nextTick(() => {
        this.$refs.tagNameInput?.focus();
      });
    },
    closeTagModal() {
      this.showTagModal = false;
    },
    async createTag() {
      const tagName = this.newTagName.trim();
      if (!tagName || !this.selectedCart) return;


      this.$emit("add-tag", { cart: this.selectedCart, tagName });

      this.closeTagModal();
    },


    getContrastColor(hex) {
      if (!hex) return "#000000";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? "#000000" : "#ffffff";
    },
    cartButtonStyle(cart) {
      const color = cart.description ? this.getContrastColor(cart.description) : "var(--bs-body-color)";
      return {
        color,
        borderColor: color,
        borderWidth: "1px",
        borderStyle: "solid",
        backgroundColor: "transparent",
      };
    },
    async removeSharedCart(cart) {
      if (!confirm(this.$t("shared_cart.remove_confirmation"))) {
        return;
      }
  
      try {
        await api.delete(`/carts/shared/${cart.id}`);
        this.carts = this.carts.filter((c) => c.id !== cart.id);
        if (this.selectedCartId === cart.id) {
          this.selectedCartId = null;
          this.$router.push({ name: "carts" });
          this.$refs.sharedCartPage.load();
        }
      } catch (err) {
        console.error("Remove shared cart failed:", err?.response?.status, err?.response?.data);
        alert(`Failed to remove shared cart (${err?.response?.status || "no status"})`);
      }
    }
  },
};
</script>