<template>
  <div class="comment-section">
    <h2 class="comment-section__title">
      Comments
      <span class="comment-section__count">{{ comments.length }}</span>
    </h2>

    <!-- Error Banner (handled locally, no emit needed) -->
    <div v-if="error" class="comments-error">
      ⚠ {{ error }}
      <button @click="localError = null">✕</button>
    </div>

    <!-- Add Comment Form -->
    <div class="comment-form">
      <div class="comment-form__avatar">{{ userInitial }}</div>
      <div class="comment-form__body">
        <textarea
          v-model="newComment"
          class="comment-form__input"
          placeholder="Add a comment..."
          rows="1"
          @input="autoResize"
          ref="textarea"
        />
        <div class="comment-form__actions">
          <button
            class="btn btn--primary"
            :disabled="!newComment.trim() || posting"
            @click="submitComment"
          >
            {{ posting ? 'Posting…' : 'Post' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="comments-loading">
      <div v-for="n in 3" :key="n" class="skeleton">
        <div class="skeleton__avatar"></div>
        <div class="skeleton__lines">
          <div class="skeleton__line skeleton__line--short"></div>
          <div class="skeleton__line"></div>
        </div>
      </div>
    </div>

    <!-- Comments Feed -->
    <div v-else>
      <div v-if="comments.length === 0" class="comments-empty">
        No comments yet. Be the first!
      </div>

      <transition-group name="comment-fade" tag="div" class="comments-list">
        <div v-for="comment in comments" :key="comment.id" class="comment">
          <div class="comment__avatar">{{ comment.authorInitial }}</div>
          <div class="comment__body">
            <div class="comment__meta">
              <span class="comment__author">{{ comment.author }}</span>
              <span class="comment__time">{{ formatTimeAgo(comment.created_at) }}</span>
            </div>
            <p class="comment__text">{{ comment.content }}</p>
          </div>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CommentSection',

  props: {
    // Raw comment rows: { id, cart_id, user_id, content, created_at, username }
    comments:    { type: Array,   default: () => [] },
    currentUser: { type: Object,  default: () => ({ id: null, username: 'You' }) },
    loading:     { type: Boolean, default: false },
    posting:     { type: Boolean, default: false },
    error:       { type: String,  default: null },
  },

  emits: [
    'post-comment',    // (content: String) → App posts to DB
  ],

  data() {
    return {
      newComment: '',
      localError: null  // dismissing the error banner is purely local UI
    }
  },

  computed: {
    userInitial() {
      return this.currentUser?.username?.[0]?.toUpperCase() ?? '?'
    }
  },

  methods: {
    formatTimeAgo(dateStr) {
      const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
      if (diff < 60) return 'Just now'
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      return `${Math.floor(diff / 86400)}d ago`
    },

    autoResize(e) {
      const el = e.target
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    },

    submitComment() {
      const content = this.newComment.trim()
      if (!content || this.posting) return
      console.log('emitting post-comment:', content)
      this.$emit('post-comment', content)
      this.newComment = ''
      if (this.$refs.textarea) this.$refs.textarea.style.height = 'auto'
    }
  }
}
</script>

<style scoped>
.comment-fade-enter-active { transition: opacity 0.2s, transform 0.2s; }
.comment-fade-enter-from { opacity: 0; transform: translateY(-6px); }
.comment-fade-leave-active { transition: opacity 0.15s; }
.comment-fade-leave-to { opacity: 0; }

.comment-section {
  border-top: 1px solid #e5e7eb;
  padding: 32px 0 48px;
  margin-top: 40px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #111827;
}

.comment-section__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-section__count {
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
}

.comments-error {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  font-size: 0.875rem;
  padding: 10px 14px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.comments-error button {
  background: none;
  border: none;
  cursor: pointer;
  color: #dc2626;
}

.comment-form {
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
}

.comment-form__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1d4ed8;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.comment-form__body { flex: 1; }

.comment-form__input {
  width: 100%;
  border: none;
  border-bottom: 1px solid #d1d5db;
  outline: none;
  resize: none;
  font-size: 0.9rem;
  font-family: inherit;
  color: #111827;
  padding: 6px 0;
  background: transparent;
  transition: border-color 0.15s;
  box-sizing: border-box;
  overflow: hidden;
  min-height: 36px;
}

.comment-form__input:focus { border-bottom-color: #1d4ed8; }
.comment-form__input::placeholder { color: #9ca3af; }

.comment-form__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.btn--primary {
  background: #1d4ed8;
  color: white;
  border: none;
  padding: 7px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.btn--primary:hover:not(:disabled) { background: #1e40af; }
.btn--primary:disabled { opacity: 0.45; cursor: not-allowed; }

.comments-loading { display: flex; flex-direction: column; gap: 20px; }

.skeleton { display: flex; gap: 12px; }

.skeleton__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e5e7eb;
  flex-shrink: 0;
  animation: shimmer 1.4s infinite;
}

.skeleton__lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.skeleton__line {
  height: 12px;
  border-radius: 4px;
  background: #e5e7eb;
  animation: shimmer 1.4s infinite;
}

.skeleton__line--short { width: 30%; }

@keyframes shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.comments-list { display: flex; flex-direction: column; gap: 20px; }

.comment { display: flex; gap: 12px; }

.comment__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #374151;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.comment__body { flex: 1; }

.comment__meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.comment__author { font-weight: 600; font-size: 0.875rem; }
.comment__time { font-size: 0.78rem; color: #9ca3af; }

.comment__text {
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.55;
  margin: 0;
}

.comments-empty {
  text-align: center;
  color: #9ca3af;
  font-size: 0.9rem;
  padding: 32px 0;
}
</style>