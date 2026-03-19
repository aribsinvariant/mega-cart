import { createApp } from 'vue'
import App from './App.vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

if (typeof browser !== 'undefined' && typeof chrome === 'undefined') {
    window.chrome = browser
}

createApp(App).mount('#app')