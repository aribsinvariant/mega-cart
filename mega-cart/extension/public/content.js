(function () {

  const isMegaCart = window.location.hostname === 'localhost'
    || window.location.hostname === 'megacart.com' // change this to whatever the actual website domain is if ever incorporated

  if (isMegaCart) {
    function syncDarkMode() {
      const fromStorage = localStorage.getItem('darkMode') === 'true'
      const fromClass   = document.body.classList.contains('dark-mode')
      const isDark      = fromStorage || fromClass
      chrome.storage.local.set({ darkMode: isDark })
    }

    syncDarkMode()

    const observer = new MutationObserver(syncDarkMode)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }


  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_DARK_MODE') {
      const isDark = localStorage.getItem('darkMode') === 'true'
      sendResponse({ isDark })
    }
    return true
  })

})()