<template>
  <div class="container py-4">
    <div class="d-flex align-items-center justify-content-between">
      <h1 class="mb-0">Carts</h1>
      <button class="btn btn-primary" type="button" @click="openModal">
        + New Cart
      </button>
    </div>

    <div class="mt-4">
      <p v-if="carts.length === 0" class="text-muted">
        No carts yet. Create one!
      </p>

      <ul v-else class="list-group">
        <li
          v-for="cart in [...carts].sort((a, b) => a.id - b.id)"
          :key="cart.id"
          class="list-group-item d-flex justify-content-between align-items-center"
          :style="{ backgroundColor: cart.description || 'var(--bs-body-bg)', color: getContrastColor(cart.description) }"
        >
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-link p-0" @click="openCart(cart)" :style="{ color: cart.description ? getContrastColor(cart.description) : 'var(--bs-body-color)' }">
                {{ cart.name }}
            </button>
            <button class="edit-btn" title="Edit" @click="openEditModal(cart)" :style="{ color: cart.description ? getContrastColor(cart.description) : 'var(--bs-body-color)' }">✏️</button>
            </div>
            <div class="d-flex gap-2">
              <button 
                class="btn ms-auto"
                :style="cartButtonStyle(cart)"
                @mouseenter="e => e.target.style.backgroundColor = getContrastColor(cart.description) === '#000000' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'"
                @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
                @click="openTagModal(cart)"
              >
                Add Tags
              </button>
              <button 
                class="btn ms-auto"
                :style="cartButtonStyle(cart)"
                @mouseenter="e => e.target.style.backgroundColor = getContrastColor(cart.description) === '#000000' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'"
                @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
                @click="openShareModal(cart)"
              >
                Share
              </button>
              <small :style="{ color: cart.description ? getContrastColor(cart.description) : 'var(--bs-body-color)' }">#{{ cart.id }}</small>
            </div>
        </li>
      </ul>
    </div>

    <div
      v-if="showEditModal"
      class="modal fade show"
      tabindex="-1"
      style="display: block;"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Edit Cart</h5>
            <button type="button" class="btn-close" @click="closeEditModal"></button>
          </div>

          <form @submit.prevent.stop="updateCart">
            <div class="modal-body">
              <label class="form-label" for="cartName">Cart name</label>
              <input
                id="cartName"
                class="form-control"
                v-model.trim="updatedCartName"
                placeholder="e.g. Groceries"
                required
                maxlength="255"
                ref="cartNameInput"
              />
              <div class="d-flex align-items-center gap-2">
                <label for="colorPicker" class="mb-0">Cart Colour:</label>
                <input type="color" id="colorPicker" v-model="selectedColor"/>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" @click="closeEditModal">
                Cancel
              </button>
              <button class="btn btn-primary" type="submit" :disabled="updatedCartName.length === 0" @click="editCart(selectedCart)">
                Update
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="showModal"
      class="modal fade show"
      tabindex="-1"
      style="display: block;"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Create New Cart</h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>

          <form @submit.prevent.stop="createCart">
            <div class="modal-body">
              <label class="form-label" for="cartName">Cart name</label>
              <input
                id="cartName"
                class="form-control"
                v-model.trim="newCartName"
                placeholder="e.g. Groceries"
                required
                maxlength="255"
                ref="cartNameInput"
              />
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" @click="closeModal">
                Cancel
              </button>
              <button class="btn btn-primary" type="submit" :disabled="newCartName.length === 0">
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

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
            <h5 class="modal-title">Create New Tag</h5>
            <button type="button" class="btn-close" @click="closeTagModal"></button>
          </div>

          <form @submit.prevent.stop="createTag">
            <div class="modal-body">
              <label class="form-label" for="tagName">Tag name</label>
              <input
                id="tagName"
                class="form-control"
                v-model.trim="newTagName"
                placeholder="e.g. Groceries"
                required
                maxlength="255"
                ref="tagNameInput"
              />
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" @click="closeTagModal">
                Cancel
              </button>
              <button class="btn btn-primary" type="submit" :disabled="newTagName.length === 0">
                Add
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div
      v-if="showShareModal"
      class="modal fade show"
      tabindex="-1"
      style="display: block;"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Share</h5>
            <button type="button" class="btn-close" @click="closeShareModal"></button>
          </div>

          <form @submit.prevent.stop="createShare">
            <div class="modal-body">
              <label class="form-label" for="shareEmail">Email address</label>
              <input
                id="shareEmail"
                class="form-control"
                v-model.trim="shareEmail"
                placeholder="e.g. user@example.com"
                required
                maxlength="255"
                ref="shareEmailInput"
              />
            </div>
            
            <button
            type="button"
            class="btn btn-link text-muted p-0 me-auto"
            @click="shareWithLink"
          >
            Share a copy with link instead
          </button>

            <div class="modal-footer">
              <div class = "form-check form-switch me-auto">
                <input class="form-check-input" type="checkbox" id="viewOnlySwitch" v-model="isViewOnly">
                <label class="form-check-label" for="viewOnlySwitch">View-only</label>
              </div>
              <button type="button" class="btn btn-outline-secondary" @click="closeShareModal">
                Cancel
              </button>
              <button class="btn btn-primary" type="submit" :disabled="shareEmail.length === 0">
                Share
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-backdrop fade show"></div>
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
export default {
  name: "CartsPage",
  props: {
    carts: {
      type: Array,
      default: () => [],
    }
  },
  data() {
    return {
      showModal: false,
      showTagModal: false,
      showEditModal: false,
      showShareModal: false,
      selectedCart: null,
      selectedColor: "",
      newCartName: "",
      newTagName: "",
      shareEmail: "",
      updatedCartName: "",
      isViewOnly: false
    };
  },
  methods: {
    openModal() {
      this.showModal = true;
      this.newCartName = "";

      this.$nextTick(() => {
        this.$refs.cartNameInput?.focus();
      });
    },
    closeModal() {
      this.showModal = false;
    },
    createCart() {
      const name = this.newCartName.trim();
      if (!name) return;

      this.$emit("create-cart", name);

      this.closeModal();
    },

    openShareModal(cart) {
      this.shareEmail = "";
      this.selectedCart = cart;
      this.showShareModal = true;
      this.isViewOnly = false;

      this.$nextTick(() => {
        this.$refs.shareEmailInput?.focus();
      });
    },
    closeShareModal() {
      this.showShareModal = false;
    },
    createShare() {
      const shareEmail = this.shareEmail.trim();
      if (!shareEmail) return;

      this.$emit("share-cart", {cart: this.selectedCart, email: shareEmail, viewOnly: this.isViewOnly});

      this.closeShareModal();
    },
    shareWithLink() {
      this.$emit("share-cart-link", this.selectedCart);
      this.closeShareModal();
    },
    openTagModal(cart) {
      this.newTagName = "";
      this.selectedCart = cart;
      this.showTagModal = true;

      this.$nextTick(() => {
        this.$refs.tagNameInput?.focus();
      });
    },
    closeTagModal() {
      this.showTagModal = false;
    },
    createTag() {
      const tagName = this.newTagName.trim();
      if (!tagName) return;

      this.$emit("add-tag", {cart: this.selectedCart, tagName: tagName});

      this.closeTagModal();
    },
    openCart(cart) {
      this.$router.push({ name: "cartDetails", params: { id: cart.id } });
    },
    openEditModal(cart) {
      this.selectedCart = cart;
      this.updatedCartName = cart.name;
      this.selectedColor = cart.description || '#ffffff';
      this.showEditModal = true;

      this.$nextTick(() => {
        this.$refs.cartNameInput?.focus();
      });
    },
    closeEditModal() {
      this.showEditModal = false;
    },
    editCart(cart) {
      const newName = this.updatedCartName.trim();
      const newColor = this.selectedColor
      if (newName) {
        this.$emit("edit-cart", { cart, newName, newColor});
        this.closeEditModal();
      }
    },
    getContrastColor(hex) {
      if (!hex) return '#000000';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#000000' : '#ffffff';
    },
    cartButtonStyle(cart) {
      const color = cart.description ? this.getContrastColor(cart.description) : 'var(--bs-body-color)';
      return { 
        color, 
        borderColor: color, 
        borderWidth: '1px', 
        borderStyle: 'solid',
        backgroundColor: 'transparent'
      };
    }
  },
};
</script>