<script lang="ts">

import type { Client } from '@authup/core-kit';
import { AClientForm } from '@authup/client-web-kit';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
    components: { AClientForm },
    props: {
        entity: {
            type: Object as PropType<Client>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        const handleUpdated = (e: Client) => {
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
    <AClientForm
        :entity="entity"
        :realm-id="entity.realmId"
        @updated="handleUpdated"
        @failed="handleFailed"
    />
</template>
