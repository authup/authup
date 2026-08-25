<script lang="ts">
import { AClientRoleAssignments, APagination, ASearch } from '@authup/client-web-kit';
import type { Client } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
    components: {
        ASearch,
        APagination,
        AClientRoleAssignments,
    },
    props: {
        entity: {
            type: Object as PropType<Client>,
            required: true,
        },
    },
});
</script>
<template>
    <AClientRoleAssignments
        :entity-id="entity.id"
        :realm-id="entity.realmId"
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
    </AClientRoleAssignments>
</template>
