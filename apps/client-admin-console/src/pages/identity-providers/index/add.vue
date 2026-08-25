<script lang="ts">
import { AIdentityProviderForm, injectStore } from '@authup/client-web-kit';
import type { IdentityProvider } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
    components: { AIdentityProviderForm },
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        const router = useRouter();

        const handleCreated = (e: IdentityProvider) => {
            router.push({ path: `/identity-providers/${e.id}` });
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
    <div>
        <AIdentityProviderForm
            @created="handleCreated"
            @failed="handleFailed"
        />
    </div>
</template>
