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
          v-for="cart in carts"
          :key="cart.id"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
            <button class="btn btn-link text-decoration-none p-0" @click="$emit('cart-selected', cart)">
                {{ cart.name }}
            </button>
            <button class="btn btn-outline-primary ms-auto" @click="openTagModal(cart)">
                Add Tags
            </button>
            <small class="text-muted">#{{ cart.id }}</small>
        </li>
      </ul>
    </div>

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
      @click.self="closeTagModal"
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

    <div v-if="showModal" class="modal-backdrop fade show"></div>
  </div>
</template>

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
      selectedCart: null,
      newCartName: "",
      newTagName: ""
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
    }
  },
};
</script>