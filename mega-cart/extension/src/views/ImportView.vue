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
        class="list-group-item d-flex justify-content-between align-items-center py-2"
        style="font-size:13px;"
      >
        <div>
          <div class="fw-bold">{{ item.name }}</div>
          <div class="text-muted">${{ Number(item.price).toFixed(2) }} × {{ item.quantity }}</div>
        </div>
        <span class="fw-bold">${{ (item.price * item.quantity).toFixed(2) }}</span>
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
              name:        i.name,
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