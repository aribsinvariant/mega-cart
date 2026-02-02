<template>
    <nav 
        :class="[`navbar-dark`, `bg-dark`, 'navbar', 'navbar-expand-lg']"
    >
        <div class="container-fluid">
            <a class="navbar-brand" href="#">Mega Cart</a>
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                <li v-for="(page, index) in pages" class="nav-item" :key="index">
                    <navbar-link
                        :page="page"
                        :isActive="activePage === index"
                        @click.prevent="navLinkClick(index)"
                    ></navbar-link>
                </li>
            </ul>
            <form class="d-flex">
            </form>
        </div>
    </nav>
</template>

<script>
import NavbarLink from './NavbarLink.vue';

export default {
    components: {
        NavbarLink
    },
            props: ['pages', 'activePage', 'navLinkClick'],
        }
</script>