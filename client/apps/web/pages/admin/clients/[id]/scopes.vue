<script lang="ts">
import { AClientScopeAssignments, ListPagination } from '@authup/client-vue';
import type { Client } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ListPagination,
        ClientScopeAssignmentList: AClientScopeAssignments,
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
    <ClientScopeAssignmentList :entity-id="entity.id">
        <template #footer="props">
            <ListPagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </ClientScopeAssignmentList>
</template>
