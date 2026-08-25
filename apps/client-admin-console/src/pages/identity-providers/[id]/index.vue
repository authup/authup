<script lang="ts">

import { AIdentityProviderForm } from '@authup/client-web-kit';
import type { IdentityProvider } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
    components: { AIdentityProviderForm },
    props: {
        entity: {
            type: Object as PropType<IdentityProvider>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        const handleUpdated = (e: IdentityProvider) => {
            emit('updated', e);
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        return {
            handleUpdated,
            handleFailed,
        };
    },
});
</script>
<template>
    <AIdentityProviderForm
        :entity="entity"
        :realm-id="entity.realmId"
        @updated="handleUpdated"
        @failed="handleFailed"
    />
</template>
