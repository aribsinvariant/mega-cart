<template>
    <navbar
        :pages="pages"
        :active-page="activePage"
        :nav-link-click="(index) => activePage = index"
    ></navbar>
    
    <page-viewer 
        :page="pages[activePage]"
    ></page-viewer>
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
                    link: {text: 'Home', url: 'index.html'},
                    pageTitle: 'Home Page',
                    content: 'This is the home landing page'
                },
                {
                    link: {text: 'Sign up', url: 'about.html'},
                    pageTitle: 'Carts Page',
                    content: 'This is the sign up page, it is currently empty'
                }
            ]
        };
    },
}
</script>