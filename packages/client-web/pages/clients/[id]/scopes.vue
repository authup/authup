<script lang="ts">
import { AClientScopeAssignments, APagination } from '@authup/client-web-kit';
import type { Client } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        APagination,
        AClientScopeAssignments,
    },
    props: {
        entity: {
            type: Object as PropType<Client>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props) {
        return {
            entity: props.entity,
        };
    },
});
</script>
<template>
    <AClientScopeAssignments :entity-id="entity.id">
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </AClientScopeAssignments>
</template>
