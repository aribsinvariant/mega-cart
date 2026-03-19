<template>
  <div class="container py-4 text-center">
    <div class="mb-3" style="font-size: 48px;">✓</div>
    <h5 class="mb-1">{{ message.title }}</h5>
    <p class="text-muted mb-1" style="font-size:13px;">{{ message.sub }}</p>
    <p class="mb-4">
      <span class="badge bg-primary" style="font-size:13px;">{{ message.cart }}</span>
    </p>
    <button class="btn btn-outline-secondary btn-sm" @click="$emit('again')">
      Add another item
    </button>
  </div>
</template>

<script>
export default {
  name: 'SuccessView',
  emits: ['again'],
  props: {
    message: { type: Object, default: () => ({}) },
  },
}
</script>