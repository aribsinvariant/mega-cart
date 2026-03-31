<template>
  <div class="container py-3">
    <div class="d-flex align-items-center mb-3">
      <button class="btn btn-link btn-sm p-0 me-2 text-decoration-none" @click="$emit('back')">
        ← Back
      </button>
      <h6 class="mb-0">Import cart from page</h6>
    </div>

    <ul class="list-group mb-3">
      <li
        v-for="(item, i) in importItems"
        :key="i"
        class="list-group-item py-2"
        style="font-size:13px;"
      >
        <div class="mb-2">
          <input class="form-control form-control-sm fw-bold" v-model.trim="item.name" placeholder="Item name" aria-label="Item name" />
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="input-group input-group-sm" style="width: 110px;">
            <span class="input-group-text text-muted px-2">$</span>
            <input type="number" class="form-control px-2" v-model.number="item.price" step="0.01" min="0" placeholder="0.00" aria-label="Item price" />
          </div>
          <span class="text-muted" style="font-size: 14px;">×</span>
          <input type="number" class="form-control form-control-sm text-center" style="width: 65px;" v-model.number="item.quantity" step="1" min="1" aria-label="Item quantity" />
          <span class="ms-auto fw-bold">${{ ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toFixed(2) }}</span>
        </div>
      </li>

      <li class="list-group-item d-flex justify-content-end py-2">
        <span class="fw-bold">Total: ${{ total }}</span>
      </li>
    </ul>

    <div class="mb-3">
      <label class="form-label mb-1" style="font-size:12px;">Destination cart</label>
      <div class="input-group input-group-sm">
        <select class="form-select" v-model="selectedCartId" :disabled="loading">
          <option value="">{{ loading ? 'Loading carts…' : 'Select a cart…' }}</option>
          <option v-for="cart in carts" :key="cart.id" :value="cart.id">{{ cart.name }}</option>
          <option value="__new__">+ Create new cart…</option>
        </select>
      </div>
    </div>

    <div v-if="selectedCartId === '__new__'" class="mb-3">
      <label class="form-label mb-1" style="font-size:12px;">New cart name</label>
      <input
        class="form-control form-control-sm"
        v-model.trim="newCartName"
        placeholder="e.g. Groceries"
        maxlength="255"
      />
    </div>

    <div v-if="importError" class="alert alert-danger py-2 mb-3" style="font-size:13px;">
      {{ importError }}
    </div>
    <div v-if="truncatedItems.length" class="alert alert-warning py-2 mb-2" style="font-size:12px;">
      ⚠️ {{ truncatedItems.length }} item name(s) exceed 255 characters and will be shortened.
    </div>
    
    <button
      class="btn btn-primary w-100"
      :disabled="!canImport || importing"
      @click="handleImport"
    >
      {{ importing ? 'Importing…' : `Import ${importItems.length} items` }}
    </button>
  </div>
</template>

<script>
import { api } from '../api.js'

export default {
  name: 'ImportView',
  emits: ['back', 'import-done'],

  props: {
    importItems: { type: Array,  default: () => [] },
    carts:       { type: Array,  default: () => [] },
    loading:     { type: Boolean, default: false },
  },

  data() {
    return {
      selectedCartId: '',
      newCartName: '',
      importing: false,
      importError: '',
    }
  },

  computed: {
    total() {
      return this.importItems
        .reduce((sum, i) => sum + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1), 0)
        .toFixed(2)
    },
    canImport() {
      if (!this.selectedCartId) return false
      if (this.selectedCartId === '__new__' && !this.newCartName.trim()) return false
      return true
    },
    truncatedItems() {
      return this.importItems.filter(i => i.name?.length > 255);
    },
  },

  methods: {
    async handleImport() {
      this.importing    = true
      this.importError  = ''

      try {
        let cartId   = this.selectedCartId
        let cartName = ''

        if (cartId === '__new__') {
          const created = await api.post('/carts', {
            name: this.newCartName.trim(),
            description: null,
            items: [],
          })
          cartId   = created.data.cartId
          cartName = this.newCartName.trim()
        } else {
          cartName = this.carts.find(c => c.id === cartId)?.name ?? ''
        }

        const full     = (await api.get(`/carts/${cartId}`)).data
        const existing = Array.isArray(full.items) ? full.items : []

        await api.put(`/carts/${cartId}`, {
          name: full.name,
          description: full.description ?? null,
          items: [
            ...existing,
            ...this.importItems.map(i => ({
              name:        i.name.slice(0, 255),
              description: i.url   ?? null,
              price:       parseFloat(i.price)    || 0,
              quantity:    parseInt(i.quantity)   || 1,
            })),
          ],
        })

        this.$emit('import-done', {
          cart:  { id: cartId, name: cartName },
          count: this.importItems.length,
        })
      } catch (err) {
        this.importError = err?.response?.data?.message ?? 'Import failed. Please try again.'
      } finally {
        this.importing = false
      }
    },
  },
}
</script>