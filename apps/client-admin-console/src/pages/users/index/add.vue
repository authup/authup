<script lang="ts">
import { AUserForm, injectStore } from '@authup/client-web-kit';
import type { User } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
    components: { AUserForm },
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        const router = useRouter();

        const handleCreated = (e: User) => {
            router.push({ path: `/users/${e.id}` });
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        return {
            realmManagementId,
            handleCreated,
            handleFailed,
        };
    },
});
</script>
<template>
    <AUserForm
        :realm-id="realmManagementId"
        @created="handleCreated"
        @failed="handleFailed"
    />
</template>
