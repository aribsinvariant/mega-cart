(function () {
  // scans arrays and objects up to a healthy depth to find arrays that map to cart objects
  const extractItemsFromObject = (obj) => {
    let foundItems = [];
    const seen = new Set();

    const search = (node, depth = 0) => {
      // limit depth for performance (can change depth if needed), and ignore nulls, non-objects, and recursion.
      if (depth > 20 || !node || typeof node !== 'object' || seen.has(node)) return;
      seen.add(node);

      if (Array.isArray(node)) {
        // evaluate if this array looks like a list of products/cart items
        if (node.length > 0 && typeof node[0] === 'object' && node[0]) {
          const firstItem = JSON.stringify(node[0]).toLowerCase();
          // extremely broad heuristic check for a product object
          if ((firstItem.includes('price') || firstItem.includes('amount')) &&
            (firstItem.includes('name') || firstItem.includes('title'))) {

            node.forEach(item => {
              if (!item || typeof item !== 'object') return;
              if (item.quantity === undefined && item.qty === undefined) return;

              // map generic object properties to our MegaCart format
              const name = item.name || item.title || item.product_title || item.ItemName || item.productName;

              // Prioritize formatted strings ("$122.00") over raw integers (12200) to avoid cent conversion issues
              const priceVal = item.formatted_price || item.formattedPrice || item.price_html || item.price || item.itemPrice || item.amount;
              const quantity = parseInt(item.quantity) || parseInt(item.qty) || 1;
              const url = item.url || item.link || window.location.href;

              // parse price
              let price = 0;
              if (typeof priceVal === 'string') {
                const match = priceVal.replace(/[^\d.]/g, ''); // strip out currency symbols
                price = parseFloat(match);
              } else if (typeof priceVal === 'number') {
                if (priceVal % 1 === 0 && (priceVal >= 100 || !!window.Shopify)) {
                  price = priceVal / 100;
                } else {
                  price = priceVal;
                }
              }

              // only accept realistic items
              if (name && price > 0) {
                foundItems.push({
                  name: String(name).trim(),
                  price: price,
                  quantity: quantity,
                  url: url
                });
              }
            });
          }
        }
        // keep searching children
        node.forEach(child => search(child, depth + 1));
      } else {
        // if it's an object, search values
        Object.values(node).forEach(child => search(child, depth + 1));
      }
    };

    search(obj);
    return foundItems;
  };

  const publishItems = (items) => {
    if (!items || items.length === 0) return;
    window.postMessage({
      type: 'MEGACART_NETWORK_INTERCEPT',
      items: items
    }, '*');
  };

  // intercept ALL Network JSON
  const processResponse = (responseText) => {
    try {
      const data = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;
      const items = extractItemsFromObject(data);
      publishItems(items);
    } catch (e) {
      // not JSON
    }
  };

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const clone = response.clone();
    clone.text().then(text => processResponse(text)).catch(e => { });
    return response;
  };

  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    return originalXhrOpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', function () {
      processResponse(this.responseText);
    });
    return originalXhrSend.apply(this, args);
  };

  // scan global data layers
  const scanDataLayers = () => {
    // these objects power tracking tools and SSR websites. The raw cart is usually inside.
    const globalObjects = [
      window.dataLayer,       // Google Analytics / GTM
      window.__INITIAL_STATE__, // React / Redux
      window.__NEXT_DATA__,     // Next.js Hydration
      window.Shopify,         // Common Shopify object
      window.utag_data        // Tealium Tracking
    ];

    globalObjects.forEach(obj => {
      if (obj) {
        const items = extractItemsFromObject(obj);
        publishItems(items);
      }
    });
  };

  // initial and delayed scans to catch lazy-loaded objects
  scanDataLayers();
  setTimeout(scanDataLayers, 2000);
  setTimeout(scanDataLayers, 5500);

})();
