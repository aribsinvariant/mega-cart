<template>
  <div class="container py-4">
    <button class="btn btn-link mb-3" @click="$emit('back')">
      ← Back to carts
    </button>

    <h1>{{ cart.name }}</h1>
    <p align="right" class="mb-0">
        <button class="btn btn-primary" type="button" @click="openModal">
            + Add Item
        </button>
    </p>

    <p v-if="cart.items.length === 0" class="mt-3">
      This cart is empty.
    </p>

    <ul v-else class="list-group mt-3">
      <li v-for="(item, i) in cart.items" :key="i" class="list-group-item">
        {{ item }}
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
  </div>
</template>

<script>
export default {
  name: "CartDetailsPage",
  props: ["cart"],
  data() {
    return {
      showModal: false,
      nextId: 1,
      newItemName: "",
    };
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
    addItems() {
      const itemName = this.newItemName.trim();
      if (!itemName) return;

      this.cart.items.push(itemName);
      this.closeModal();
    }
  },
};
</script>