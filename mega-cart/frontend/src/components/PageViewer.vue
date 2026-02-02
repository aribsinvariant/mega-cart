<template>
  <component
    :is="page.component"
    @signup-success="$emit('signup-success')"
    @login-success="$emit('login-success')"
  />
</template>

<script>
import HomePage from "./HomePage.vue";
import SignUpPage from "./SignUpPage.vue";
import LogInPage from "./LogInPage.vue";

export default {
  props: ["page"],
  components: { HomePage, SignUpPage, LogInPage },
};
</script>