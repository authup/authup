<script lang="ts">
import { storeToRefs } from 'pinia';
import { useToast } from 'bootstrap-vue-next';
import { UserPasswordForm } from '@authup/client-vue';
import { defineNuxtComponent } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey } from '~/config/layout';
import { useAuthStore } from '~/store/auth';

export default defineNuxtComponent({
    components: {
        UserPasswordForm,
    },
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        });

        const toast = useToast();

        const store = useAuthStore();
        const { userId } = storeToRefs(store);

        const handleUpdated = () => {
            if (toast) {
                toast.success({ body: 'The account was successfully updated.' });
            }
        };

        const handleFailed = (e: Error) => {
            if (toast) {
                toast.warning({ body: e.message });
            }
        };

        return {
            id: userId,
            handleUpdated,
            handleFailed,
        };
    },
});
</script>
<template>
    <div>
        <h6 class="title">
            Password
        </h6>
        <UserPasswordForm
            :id="id"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>
