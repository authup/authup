<script lang="ts">
import { ATrustAnchorForm, injectStore } from '@authup/client-web-kit';
import type { TrustAnchor } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
    components: { ATrustAnchorForm },
    emits: ['failed'],
    setup(_props, { emit }) {
        const router = useRouter();

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        return {
            realmManagementId,
            handleCreated: (entity: TrustAnchor) => router.push({ path: `/trust-anchors/${entity.id}` }),
            handleFailed: (e: Error) => emit('failed', e),
        };
    },
});
</script>

<template>
    <ATrustAnchorForm
        :realm-id="realmManagementId"
        @created="handleCreated"
        @failed="handleFailed"
    />
</template>
