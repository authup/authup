<script lang="ts">

import { APagination, ARobotRoleAssignments, ASearch } from '@authup/client-web-kit';
import type { Robot } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ASearch,
        APagination,
        ARobotRoleAssignments,
    },
    props: {
        entity: {
            type: Object as PropType<Robot>,
            required: true,
        },
    },
});
</script>
<template>
    <ARobotRoleAssignments :entity-id="entity.id">
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
    </ARobotRoleAssignments>
</template>
