<script lang="ts">

import { AIdentityProviderRoleAssignments, APagination, ASearch } from '@authup/client-web-kit';
import type { IdentityProvider } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
    components: {
        ASearch,
        APagination,
        AIdentityProviderRoleAssignments,
    },
    props: {
        entity: {
            type: Object as PropType<IdentityProvider>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        return { handleFailed };
    },
});
</script>
<template>
    <AIdentityProviderRoleAssignments
        :entity-id="entity.id"
        @failed="handleFailed"
    >
        <template #header="props">
            <ASearch
                :load="props.load"
                :meta="props.meta"
            />
        </template>
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </AIdentityProviderRoleAssignments>
</template>
