import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

api.interceptors.request.use(async (config) => {
  let token = null
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const result = await chrome.storage.local.get('token')
    token = result.token ?? null
  } else {
    token = localStorage.getItem('token')
  }
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})