<script lang="ts">
import { AClientRoleAssignments, APagination } from '@authup/client-web-kit';
import type { Client } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        APagination,
        AClientRoleAssignments,
    },
    props: {
        entity: {
            type: Object as PropType<Client>,
            required: true,
        },
    },
    setup(props) {
        return {
            entity: props.entity,
        };
    },
});
</script>
<template>
    <AClientRoleAssignments :entity-id="entity.id">
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </AClientRoleAssignments>
</template>
