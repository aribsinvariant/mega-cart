import { reactive, computed } from 'vue'

async function readToken() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const result = await chrome.storage.local.get('token')
    return result.token ?? null
  }
  return localStorage.getItem('token')
}

async function writeToken(t) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    await chrome.storage.local.set({ token: t })
  } else {
    localStorage.setItem('token', t)
  }
}

async function removeToken() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    await chrome.storage.local.remove('token')
  } else {
    localStorage.removeItem('token')
  }
}

export const auth = reactive({
  token: null,

  async init() {
    this.token = await readToken()
  },

  async setToken(t) {
    this.token = t
    await writeToken(t)
  },

  async clear() {
    this.token = null
    await removeToken()
  },
})

export const isLoggedIn = computed(() => !!auth.token)