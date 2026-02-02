<template>
    <navbar
        :pages="pages"
        :active-page="activePage"
        :nav-link-click="(index) => activePage = index"
    ></navbar>
    
    <page-viewer
        :page="pages[activePage]"
        @signup-success="goLogin"
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
            pages: [
                {
                    link: { text: "Home", url: "index.html" },
                    component: "HomePage",
                },
                {
                    link: { text: "Sign up", url: "signup.html" },
                    component: "SignUpPage",
                }
            ]
        };
    },
    methods: {
        goLogin() {
            alert("Redirecting to login page...");
            this.activePage = 0;
        },
    }
}
</script>