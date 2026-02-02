<template>
  <component
    :is="page.component"
    @signup-success="$emit('signup-success')"
  />
</template>

<script>
import HomePage from "./HomePage.vue";
import SignUpPage from "./SignUpPage.vue";

export default {
  props: ["page"],
  components: { HomePage, SignUpPage },
};
</script>