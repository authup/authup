<script lang="ts">

import { UserForm } from '@authup/client-vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'vue-toastification';
import { defineNuxtComponent } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey } from '../../../config/layout';
import { useAuthStore } from '../../../store/auth';

export default defineNuxtComponent({
    components: {
        UserForm,
    },
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        });

        const store = useAuthStore();

        const { user, userId } = storeToRefs(store);

        const handleUpdated = () => {
            const toast = useToast();
            toast.success('The account was successfully updated.');
        };

        const handleFailed = (e: Error) => {
            const toast = useToast();
            toast.warning(e.message);
        };

        return {
            user,
            userId,
            handleUpdated,
            handleFailed,
        };
    },
});
</script>
<template>
    <div>
        <UserForm
            :can-manage="false"
            :realm-id="userId"
            :entity="user"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>
