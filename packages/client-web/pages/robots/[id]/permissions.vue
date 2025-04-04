<script lang="ts">

import { APagination, ARobotPermissionAssignments, ASearch } from '@authup/client-web-kit';
import type { Robot } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ASearch,
        APagination,
        ARobotPermissionAssignments,
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
    <ARobotPermissionAssignments :entity-id="entity.id">
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
    </ARobotPermissionAssignments>
</template>
