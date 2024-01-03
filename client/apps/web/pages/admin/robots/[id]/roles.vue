<script lang="ts">

import { ARobotRoleAssignments, ListPagination } from '@authup/client-vue';
import type { Robot } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ListPagination,
        RobotRoleAssignmentList: ARobotRoleAssignments,
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
    <RobotRoleAssignmentList :entity-id="entity.id">
        <template #footer="props">
            <ListPagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </RobotRoleAssignmentList>
</template>
