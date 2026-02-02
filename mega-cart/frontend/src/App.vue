<template>
    <navbar
        :pages="pages"
        :active-page="activePage"
        :nav-link-click="(index) => activePage = index"
    ></navbar>
    
    <page-viewer
        :page="pages[activePage]"
        @signup-success="goLogin"
        @login-success="goHome"
        :carts="carts"
        :selected-cart="selectedCart"
        @cart-selected="openCart"
        @back="goToCarts"
        @create-cart="createCart"
        @add-item="addItemToCart"
    />
</template>

<script>
import Navbar from './components/Navbar.vue';
import PageViewer from './components/PageViewer.vue';

export default {
    components: {
        Navbar,
        PageViewer
    },
    data() {
        return {
            activePage: 0,
            selectedCartId: null,
            carts: [],
            nextCartId: 1,
            currentUser: null,
            pages: [
                {
                    link: { text: "Home", url: "index.html" },
                    component: "HomePage",
                    visible: true
                },
                {
                    link: { text: "Sign up", url: "signup.html" },
                    component: "SignUpPage",
                    visible: true
                },
                {
                    link: { text: "Log in", url: "login.html" },
                    component: "LogInPage",
                    visible: true
                },
                {
                    link: { text: "Carts", url: "cart.html" },
                    component: "CartPage",
                    visible: true
                },
                {
                    link: { text: "Cart Details", url: "cart-details.html" },
                    component: "CartDetailsPage",
                    visible: false
                },
            ]
        };
    },
    computed: {
        selectedCart(){
            return this.carts.find( c => c.id === this.selectedCartId) || null;
        }
    },
    methods: {
        goLogin() {
            alert("Redirecting to login page...");
            this.activePage = 2;
        },
        goHome() {
            alert("Redirecting to home page...");
            this.activePage = 0;
        },
        createCart(name) {
            const trimmed = (name || "").trim();
            if (!trimmed) return;

            this.carts.push({
                id: this.nextCartId++,
                name: trimmed,
                items: []
            });
        },
        addItemToCart({cartId, itemName}) {
            const trimmed = (itemName || "").trim();
            if (!trimmed) return;

            const cart = this.carts.find(c => c.id === cartId);
            if (!cart) return;

            cart.items.push(trimmed);
        },
        openCart(cart) {
            this.selectedCartId = cart.id;
            this.activePage = 4; // CartDetailsPage index
        },
        goToCarts() {
            this.activePage = 3;
            this.selectedCartId = null;
        }
    }
}
</script>