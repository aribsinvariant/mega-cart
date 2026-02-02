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
        :selected-cart="selectedCart"
        @cart-selected="openCart"
        @back="goToCarts"
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
            selectedCart: null,
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
    methods: {
        goLogin() {
            alert("Redirecting to login page...");
            this.activePage = 2;
        },
        goHome() {
            alert("Redirecting to home page...");
            this.activePage = 0;
        },
        openCart(cart) {
            this.selectedCart = cart;
            this.activePage = 4; // CartDetailsPage index
        },
        goToCarts() {
            this.activePage = 3;
            this.selectedCart = null;
        }
    }
}
</script>