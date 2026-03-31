(function () {

  const isMegaCart = window.location.hostname === 'localhost'
    || window.location.hostname === 'megacart.com' // change this to whatever the actual website domain is if ever incorporated

  if (isMegaCart) {
    function syncDarkMode() {
      const fromStorage = localStorage.getItem('darkMode') === 'true'
      const fromClass = document.body.classList.contains('dark-mode')
      const isDark = fromStorage || fromClass
      chrome.storage.local.set({ darkMode: isDark })
    }

    syncDarkMode()

    const observer = new MutationObserver(syncDarkMode)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  }

  // network interceptor
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = function () { this.remove(); };
    (document.head || document.documentElement).appendChild(script);
  } catch (e) { }

  let bestItems = [];

  function updateItemsInStorage(newItems) {
    if (!newItems || newItems.length === 0) return;
    // standardizing
    const standardized = newItems.map(item => {
      let price = item.price;
      if (typeof price === 'string') {
        const match = price.match(/[\d,.]+/);
        price = match ? parseFloat(match[0].replace(/,/g, '')) : 0;
      }
      return {
        name: item.name || item.title || item.product_title || 'Unknown Item',
        price: parseFloat(price) || 0,
        quantity: parseInt(item.quantity) || 1,
        url: item.url || window.location.href
      };
    });

    // network data is preferred
    bestItems = standardized;
    chrome.storage.local.set({ detectedCartItems: bestItems });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === 'MEGACART_NETWORK_INTERCEPT') {
      updateItemsInStorage(event.data.items);
    }
  });

  // Heuristic Scanner fallback
  let scanTimeout = null;
  function scanDOMForCart() {

    const items = [];
    const host = window.location.hostname;

    if (host.includes('amazon.')) {
      document.querySelectorAll('.sc-list-item').forEach(row => {
        const titleEl = row.querySelector('.sc-product-title, .a-truncate-cut');
        const priceEl = row.querySelector('.sc-product-price, .sc-item-price');
        const qtyEl = row.querySelector('.a-dropdown-prompt, input[name="quantity"]');
        if (titleEl && row.innerText.includes('$')) {
          let quantity = 1;
          if (qtyEl) {
            const qtyStr = qtyEl.value || qtyEl.innerText || '';
            const match = qtyStr.match(/\d+/);
            if (match) quantity = parseInt(match[0], 10);
          }
          items.push({
            name: titleEl.innerText.trim(),
            price: priceEl ? priceEl.innerText.trim() : 0,
            quantity: quantity,
          });
        }
      });
    } else {
      // generic fallback for all other sites
      const cartRows = document.querySelectorAll('.cart-item, [data-cart-item], .mini-cart-item, .item-list .item');
      cartRows.forEach(row => {
        const titleEl = row.querySelector('.product-title, .item-title, h3, a.title, .name');
        const priceEl = row.querySelector('.price, .item-price, .amount');
        const qtyEl = row.querySelector('input[type="number"], .quantity, select.qty');

        if (titleEl) {
          items.push({
            name: titleEl.innerText.trim(),
            price: priceEl ? priceEl.innerText.trim() : 0,
            quantity: qtyEl && qtyEl.value ? parseInt(qtyEl.value) : 1,
          });
        }
      });
    }
    if (items.length > 0) {
      updateItemsInStorage(items);
    }
  }

  

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_DARK_MODE') {
      const isDark = localStorage.getItem('darkMode') === 'true'
      sendResponse({ isDark })
      return true
    }
    if (message.type === 'SCAN_FOR_CART_ITEMS') {

      const onScanComplete = (event) => {
        if (event.source !== window || !event.data) return;
        if (event.data.type !== 'MEGACART_SCAN_COMPLETE') return;
        window.removeEventListener('message', onScanComplete);

        // If network/data-layer scan found nothing, fall back to DOM heuristics
        if (bestItems.length === 0) {
          scanDOMForCart();
        }

        const items = bestItems;
        chrome.storage.local.set({ detectedCartItems: items });
        sendResponse({ success: true, items });
      };

      window.addEventListener('message', onScanComplete);
      window.postMessage({ type: 'MEGACART_TRIGGER_SCAN' }, '*');

      return true;
    }
    return true
  })

})()