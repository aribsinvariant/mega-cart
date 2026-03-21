
const API_BASE = 'http://localhost:8080'


async function getToken() {
  const { token } = await chrome.storage.local.get('token')
  return token ?? null
}

async function apiFetch(path, options = {}) {
  const token = await getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}


chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(result => sendResponse({ success: true,  ...result }))
    .catch(err   => sendResponse({ success: false, error: err.message }))
  return true
})

async function handleMessage(msg) {
  switch (msg.type) {

    case 'LOGIN': {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: msg.email, password: msg.password }),
      })
      await chrome.storage.local.set({ token: data.token, userEmail: msg.email })
      return { token: data.token }
    }

    case 'LOGOUT': {
      await chrome.storage.local.remove(['token', 'userEmail'])
      return {}
    }

    case 'GET_SESSION': {
      const { token, userEmail } = await chrome.storage.local.get(['token', 'userEmail'])
      return { token: token ?? null, userEmail: userEmail ?? null }
    }

    case 'GET_CARTS': {
      const carts = await apiFetch('/carts')
      return { carts }
    }

    case 'ADD_ITEM': {
      const cart     = await apiFetch(`/carts/${msg.cartId}`)
      const existing = Array.isArray(cart.items) ? cart.items : []
      await apiFetch(`/carts/${msg.cartId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name:        cart.name,
          description: cart.description ?? null,
          items: [
            ...existing,
            {
              name:        msg.item.name,
              description: msg.item.url      || null,
              price:       parseFloat(msg.item.price)   || 0,
              quantity:    parseInt(msg.item.quantity)  || 1,
            },
          ],
        }),
      })
      return {}
    }

    case 'IMPORT_ITEMS': {
      let cartId   = msg.cartId
      let cartName = msg.newCartName ?? ''

      if (cartId === '__new__') {
        const created = await apiFetch('/carts', {
          method: 'POST',
          body: JSON.stringify({ name: cartName, description: null, items: [] }),
        })
        cartId = created.cartId
      }

      const cart     = await apiFetch(`/carts/${cartId}`)
      const existing = Array.isArray(cart.items) ? cart.items : []
      cartName       = cart.name

      await apiFetch(`/carts/${cartId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name:        cart.name,
          description: cart.description ?? null,
          items: [
            ...existing,
            ...msg.items.map(i => ({
              name:        i.name,
              description: i.url      || null,
              price:       parseFloat(i.price)   || 0,
              quantity:    parseInt(i.quantity)  || 1,
            })),
          ],
        }),
      })
      return { cartId, cartName }
    }

    default:
      throw new Error(`Unknown message type: ${msg.type}`)
  }
}