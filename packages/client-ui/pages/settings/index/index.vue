<script lang="ts">

import { UserForm } from '@authup/client-vue';
import type { User } from '@authup/core';
import { storeToRefs } from 'pinia';
import { useToast } from 'bootstrap-vue-next';
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

        const toast = useToast();

        const store = useAuthStore();

        const { user, userId } = storeToRefs(store);

        const handleUpdated = (entity: User) => {
            toast.success({ body: 'The account was successfully updated.' });

            store.setUser(entity);
        };

        const handleFailed = (e: Error) => {
            toast.warning({ body: e.message });
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
