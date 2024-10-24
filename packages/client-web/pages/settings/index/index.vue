<script lang="ts">

import { AUserForm, injectStore } from '@authup/client-web-kit';
import type { User } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { definePageMeta, useToast } from '#imports';
import { defineNuxtComponent } from '#app';
import { LayoutKey } from '../../../config/layout';

export default defineNuxtComponent({
    components: {
        UserForm: AUserForm,
    },
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        });

        const toast = useToast();

        const store = injectStore();

        const { user, userId } = storeToRefs(store);

        const handleUpdated = (entity: User) => {
            toast.show({ variant: 'success', body: 'The account was successfully updated.' });

            store.setUser(entity);
        };

        const handleFailed = (e: Error) => {
            toast.show({ variant: 'warning', body: e.message });
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
        <h6 class="title">
            General
        </h6>
        <UserForm
            :can-manage="false"
            :realm-id="userId"
            :entity="user"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>
