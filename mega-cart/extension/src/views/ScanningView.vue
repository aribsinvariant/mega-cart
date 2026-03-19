<template>
  <div class="container py-4">
    <h6 class="mb-3">Analyzing page…</h6>

    <ul class="list-group">
      <li
        v-for="(step, i) in steps"
        :key="i"
        class="list-group-item d-flex align-items-center gap-2 py-2"
        :class="{
          'text-muted':   i > currentStep,
          'text-success': i < currentStep,
        }"
        style="font-size:13px;"
      >
        <!-- done -->
        <span v-if="i < currentStep" class="text-success">✓</span>
        <!-- active spinner -->
        <span v-else-if="i === currentStep && !failed" class="spinner-border spinner-border-sm text-primary" role="status"></span>
        <!-- failed -->
        <span v-else-if="i === currentStep && failed" class="text-danger">✕</span>
        <!-- pending -->
        <span v-else class="step-placeholder"></span>

        {{ step.label }}
      </li>
    </ul>

    <div v-if="failed" class="mt-3">
      <div class="alert alert-warning py-2 mb-3" style="font-size:13px;">
        {{ errorMsg }}
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-primary btn-sm" @click="startScan">Try again</button>
        <button class="btn btn-outline-secondary btn-sm" @click="skipToManual">Add item manually</button>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../api.js'

export default {
  name: 'ScanningView',
  emits: ['scan-complete'],

  data() {
    return {
      currentStep: 0,
      failed: false,
      errorMsg: '',
      steps: [
        { label: 'Reading page content' },
        { label: 'Sending to AI for analysis' },
        { label: 'Extracting item details' },
        { label: 'Checking for full cart' },
      ],
    }
  },

  mounted() {
    this.startScan()
  },

  methods: {
    async startScan() {
      this.currentStep = 0
      this.failed      = false
      this.errorMsg    = ''

      if (typeof chrome !== 'undefined' && chrome.runtime) {
        this.currentStep = 1
        const response = await chrome.runtime.sendMessage({ type: 'SCAN_TAB' })

        if (!response.success) {
          this.failed   = true
          this.errorMsg = response.error ?? 'Something went wrong. Please try again.'
          return
        }

        this.currentStep = 2
        await this.delay(300)
        this.currentStep = 3
        await this.delay(300)
        this.currentStep = 4

        this.$emit('scan-complete', {
          item:        response.item        ?? null,
          importItems: response.importItems ?? [],
        })
      } else {
        for (let i = 0; i <= this.steps.length; i++) {
          this.currentStep = i
          await this.delay(700)
        }
        this.$emit('scan-complete', {
          item: {
            name:     'Apple AirPods Pro (2nd Generation)',
            price:    '189.99',
            quantity: 1,
            url:      'https://amazon.com/dp/B09G9HD6PD',
          },
          importItems: [
            { name: 'Apple AirPods Pro (2nd Gen)', price: 189.99, quantity: 1, url: 'https://amazon.com/dp/B09G9HD6PD' },
            { name: 'Anker USB-C Hub 7-in-1',      price: 39.99,  quantity: 2, url: 'https://amazon.com/dp/B08HZ6PS61' },
            { name: 'MX Keys Mini Keyboard',        price: 99.99,  quantity: 1, url: 'https://amazon.com/dp/B098JPSVKY' },
            { name: 'Logitech MX Master 3S',        price: 99.99,  quantity: 1, url: 'https://amazon.com/dp/B09HM94VDS' },
          ],
        })
      }
    },

    skipToManual() {
      this.$emit('scan-complete', {
        item:        { name: '', price: '', quantity: 1, url: '' },
        importItems: [],
      })
    },

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },
  },
}
</script>

<style scoped>
.step-placeholder {
  display: inline-block;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
</style>