<template>
    <div class="container py-4">
        <h1>{{ $t('account_settings.account_settings') }}</h1>

        <div class="mb-4">
            <label class="form-label">{{ $t('account_settings.profile_picture') }}</label>
            <div class="d-flex align-items-center gap-3">
                <img
                :src="profilePicture || defaultAvatar"
                alt="Profile Picture"
                class="rounded-circle"
                style="width: 80px; height: 80px; object-fit: cover;"
                />
                <button type="button" class="btn btn-outline-secondary" @click="$refs.fileInput.click()">
                    {{ $t('account_settings.edit') }}
                </button>
                <input
                ref="fileInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleFileChange"
                />
            </div>
        </div>

        <div class="mb-4">
            <label class="form-label">{{ $t('account_settings.name') }}</label>
            <div v-if="!editingName">
                <input class="form-control w-auto mb-2" :value="userName" disabled />
                <button type="button" class="btn btn-outline-secondary" @click="startEditName">{{ $t('account_settings.edit') }}</button>
            </div>
            <div v-else class="d-flex align-items-center gap-2">
                <input id="displayName" class="form-control w-auto" v-model.trim="tempName" />
                <button type="button" class="btn btn-primary" @click="saveName" :disabled="!tempName">{{ $t('account_settings.save') }}</button>
                <button type="button" class="btn btn-outline-secondary" @click="cancelEditName">{{ $t('account_settings.cancel') }}</button>
            </div>
            <p v-if="nameMsg" :class="nameSuccess ? 'text-success mt-1' : 'text-danger mt-1'">{{ nameMsg }}</p>
        </div>

        <div class="mb-4">
            <div>
                <button type="button" class="btn btn-outline-primary" @click="$router.push({ name: 'securitySettings' })">
                    {{ $t('account_settings.change_email_password') }}
                </button>
            </div>
        </div>


        <button class="btn btn-secondary mb-3" @click="$router.push({ name: 'carts' })">
            {{ $t('account_settings.back_to_carts') }}
        </button>
    </div>
</template>

<script>
import { api } from "../api";
import { auth } from "../logged/auth";

export default {
  name: "AccountSettings",
  data() {
    return {
        profilePicture: null,
        defaultAvatar: "https://ui-avatars.com/api/?name=User&background=dee2e6&color=6c757d&size=128",
        userName: "",
        editingName: false,
        tempName: "",
        };
  },
  async mounted() {
    try {
      const res = await api.get("auth/account/me");
      this.userName = res.data.username;
      // after adding profile picture support to backend, this is where we would set the profile picture URL:
      // this.profilePicture = res.data.profilePicture || null;
    } catch (e) {
      console.error("Failed to load user", e);
    }
  },
  computed: {
  },
  methods: {
    async handleFileChange(event) {
      //TODO: Implement actual profile picture upload functionality. This is just a placeholder to show how it would work.
      const file = event.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("profilePicture", file);
      try {
        const res = await api.post("/auth/account/profile-picture", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        this.profilePicture = res.data.profilePicture;
      } catch (e) {
        console.error("Profile picture upload not yet implemented", e);
      }
    },
    startEditName() {
      this.tempName = this.userName;
      this.nameMsg = "";
      this.editingName = true;
    },
    cancelEditName() {
      this.editingName = false;
      this.tempName = "";
      this.nameMsg = "";
    },
    async saveName() {
      // TODO: Create a working backend endpoint for this
        try {
            await api.put("/auth/account/username", { username: this.tempName });
            this.userName = this.tempName;
            this.nameMsg =  this.$t('account_settings.name_updated') ;
            this.nameSuccess = true;
        } catch (e) {
            console.error("Failed to update display name", e);
            this.nameMsg =  this.$t('account_settings.name_update_failed') ;
            this.nameSuccess = false;
        } finally {
            this.editingName = false;
        }
    },
  },
};
</script>