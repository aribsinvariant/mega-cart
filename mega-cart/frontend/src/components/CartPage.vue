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

          <form @submit.prevent="createCart">
            <div class="modal-body">
              <label class="form-label" for="cartName">Cart name</label>
              <input
                id="cartName"
                class="form-control"
                v-model.trim="newCartName"
                placeholder="e.g. Groceries"
                required
                maxlength="40"
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

    <!-- Backdrop -->
    <div v-if="showModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script>
export default {
  name: "CartsPage",
  data() {
    return {
      carts: [],
      showModal: false,
      newCartName: "",
      nextId: 1,
    };
  },
  methods: {
    openModal() {
      this.showModal = true;
      this.newCartName = "";

      // focus the input after DOM updates
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

      this.carts.push({ id: this.nextId++, name, items: [] });
      this.closeModal();
    },
  },
};
</script>