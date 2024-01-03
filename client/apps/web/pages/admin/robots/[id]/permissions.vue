<script lang="ts">

import { ARobotPermissionAssignments, ListPagination } from '@authup/client-vue';
import type { Robot } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ListPagination,
        RobotPermissionAssignmentList: ARobotPermissionAssignments,
    },
    props: {
        entity: {
            type: Object as PropType<Robot>,
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
    <RobotPermissionAssignmentList :entity-id="entity.id">
        <template #footer="props">
            <ListPagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </RobotPermissionAssignmentList>
</template>
