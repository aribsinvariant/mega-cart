<template>
  <div class="container py-3">

    <div class="d-flex align-items-center justify-content-between mb-3">
      <h6 class="mb-0">Add items to cart</h6>
      <small v-if="pageUrl" class="text-muted text-truncate ms-2" style="font-size:11px; max-width:200px;">
        {{ pageUrl }}
      </small>
    </div>

    <form @submit.prevent="handleAddItem">
      <div class="mb-2">
        <label class="form-label mb-1" style="font-size:12px;">Item name</label>
        <input
          class="form-control form-control-sm"
          v-model.trim="itemName"
          placeholder="e.g. Apple AirPods Pro"
          maxlength="40"
          required
          ref="nameInput"
        />
      </div>

      <div class="mb-2">
        <label class="form-label mb-1" style="font-size:12px;">Link</label>
        <input
          class="form-control form-control-sm"
          v-model.trim="itemUrl"
          placeholder="e.g. https://example.com/product"
          maxlength="1024"
        />
      </div>

      <div class="row g-2 mb-3">
        <div class="col-6">
          <label class="form-label mb-1" style="font-size:12px;">Price ($)</label>
          <input
            class="form-control form-control-sm"
            v-model.trim="itemPrice"
            placeholder="e.g. 1.99"
            type="number"
            step="0.01"
            min="0"
          />
        </div>
        <div class="col-6">
          <label class="form-label mb-1" style="font-size:12px;">Quantity</label>
          <input
            class="form-control form-control-sm"
            v-model.number="itemQuantity"
            placeholder="e.g. 1"
            type="number"
            step="1"
            min="1"
          />
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label mb-1" style="font-size:12px;">Cart</label>
        <select class="form-select form-select-sm" v-model="selectedCartId" :disabled="loading" required>
          <option value="">{{ loading ? 'Loading carts…' : 'Select a cart…' }}</option>
          <option v-for="cart in carts" :key="cart.id" :value="cart.id">
            {{ cart.name }}
          </option>
        </select>
      </div>

      <div v-if="errorMsg" class="alert alert-danger py-2 mb-2" style="font-size:13px;">
        {{ errorMsg }}
      </div>

      <button
        type="button"
        class="btn btn-info w-100 mb-2"
        @click="runAutofill"
        :disabled="!itemUrl || autofilling"
      >
        <span
          v-if="autofilling"
          class="spinner-border spinner-border-sm me-1"
          role="status"
          style="width:13px;height:13px;"
        ></span>
        {{ autofilling ? 'Filling in details…' : 'Autofill' }}
      </button>

      <div v-if="autofillError" class="alert alert-warning py-2 mb-2" style="font-size:12px;">
        {{ autofillError }}
      </div>

      <button
        class="btn btn-primary w-100"
        type="submit"
        :disabled="!itemName || !selectedCartId || submitting"
      >
        {{ submitting ? 'Adding…' : 'Add item' }}
      </button>
    </form>

    <hr class="my-3" />

    <div class="d-flex align-items-center justify-content-between">
      <div>
        <p class="mb-0 fw-bold" style="font-size:13px;">Import multiple items</p>
        <p class="text-muted mb-0" style="font-size:12px;">Manually add several items at once.</p>
      </div>
      <button
        class="btn btn-outline-secondary btn-sm"
        :disabled="scanLoading"
        @click="$emit('go-import')"
      >
        <span
          v-if="scanLoading"
          class="spinner-border spinner-border-sm me-1"
          style="width:13px;height:13px;"
        ></span>
        {{ scanLoading ? 'Scanning…' : 'Open →' }}
      </button>
    </div>

  </div>
</template>

<script>
import { api } from '../api.js'

export default {
  name: 'MainView',
  emits: ['item-added', 'go-import'],

  props: {
    carts:   { type: Array,   default: () => [] },
    loading: { type: Boolean, default: false },
    pageUrl: { type: String,  default: '' },
    scanLoading: { type: Boolean, default: false },
  },

  data() {
    return {
      itemName:       '',
      itemUrl:        '',
      itemPrice:      '',
      itemQuantity:   1,
      selectedCartId: '',
      submitting:     false,
      errorMsg:       '',
      autofilling:    false,
      autofillError:  '',
    }
  },

  watch: {
    pageUrl(val) {
      if (val && !this.itemUrl) this.itemUrl = val
    },
  },

  mounted() {
    if (this.pageUrl && !this.itemUrl) this.itemUrl = this.pageUrl
    this.$nextTick(() => this.$refs.nameInput?.focus())
  },

  methods: {
    async runAutofill() {
      this.autofilling   = true
      this.autofillError = ''
 
      try {
        const res  = await api.post('/autofill', { url: this.itemUrl })
        const item = res.data
        if (item.name)     this.itemName     = item.name
        if (item.price != null) this.itemPrice = item.price
        if (item.quantity) this.itemQuantity = item.quantity
      } 
      catch (err) {
        this.autofillError = err?.response?.data?.message ?? 'Autofill failed. Please fill in details manually.'
        console.error('Autofill error:', err)
      } 
      finally {
        this.autofilling = false
      }
    },

    async handleAddItem() {
      if (!this.itemName || !this.selectedCartId) return
      this.submitting = true
      this.errorMsg   = ''
      try {
        const full     = (await api.get(`/carts/${this.selectedCartId}`)).data
        const existing = Array.isArray(full.items) ? full.items : []
        await api.put(`/carts/${this.selectedCartId}`, {
          name:        full.name,
          description: full.description ?? null,
          items: [
            ...existing,
            {
              name:        this.itemName.slice(0, 255),
              description: this.itemUrl  || null,
              price:       parseFloat(this.itemPrice)  || 0,
              quantity:    parseInt(this.itemQuantity) || 1,
            },
          ],
        })
        const cart = this.carts.find(c => c.id === this.selectedCartId)
        this.$emit('item-added', { itemName: this.itemName, cart })
      } catch (err) {
        this.errorMsg = err?.response?.data?.message ?? 'Failed to add item. Please try again.'
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>