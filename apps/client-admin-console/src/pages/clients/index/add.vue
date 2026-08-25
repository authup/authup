<script lang="ts">

import { AClientForm, injectStore } from '@authup/client-web-kit';
import type { Client } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
    components: { AClientForm },
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        const router = useRouter();

        const handleCreated = (e: Client) => {
            router.push({ path: `/clients/${e.id}` });
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
    <AClientForm
        :realm-id="realmManagementId"
        @created="handleCreated"
        @failed="handleFailed"
    />
</template>
