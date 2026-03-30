<template>
    <div class="container py-4">
        <h1>{{ $t("inbox.shared_cart_inbox") }}</h1>
        <p v-if="invites.length === 0">
            {{ $t("inbox.no_invites") }}
        </p>
        <ul v-else class="list-group mt-3">
            <li v-for="c in invites" :key="c.id" class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-semibold text-truncate-custom">{{ c.name }}</div>
                    <small class="text-body-secondary">
                        {{ $t("inbox.permission") }}: {{ c.can_edit ? $t("inbox.editable") : $t("inbox.view_only") }}
                    </small>
                </div>

                <div class="d-flex gap-2">
                    <button class="btn btn-outline-danger btn-sm" @click="decline(c.id)">{{$t("inbox.decline")}}</button>
                    <button class="btn btn-primary btn-sm" @click="accept(c.id)">{{$t("inbox.accept")}}</button>
                </div>
            </li>
        </ul>
    </div>
</template>

<script>
import { api } from "../api";
export default {
    name: "SharedCartInbox",
    emits: ["update-inbox"],
    data() {
        return {
            invites: [],
        };
    },
    async mounted() {
        await this.load();
    },
    methods: {
        async load() {
            const res = await api.get("/carts/invites");
            this.invites = res.data;
        },
        async accept(id) {
            await api.post(`/carts/${id}/invites/accept`);
            await this.load();
            this.$emit("update-inbox");
        },
        async decline(id) {
            await api.post(`/carts/${id}/invites/decline`);
            await this.load();
            this.$emit("update-inbox");
        }
    }
};
</script>

<style scoped>
  .text-truncate-custom {
    max-width: 30ch;      
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
    vertical-align: middle;
  }
</style>