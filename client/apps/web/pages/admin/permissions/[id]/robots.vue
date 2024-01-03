<script lang="ts">

import { APermissionRobotAssignments, ListPagination } from '@authup/client-vue';
import type { Permission } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ListPagination,
        PermissionRobotAssignmentList: APermissionRobotAssignments,
    },
    props: {
        entity: {
            type: Object as PropType<Permission>,
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
    <div>
        <PermissionRobotAssignmentList :entity-id="entity.id">
            <template #footer="props">
                <ListPagination
                    :busy="props.busy"
                    :meta="props.meta"
                    :load="props.load"
                />
            </template>
        </PermissionRobotAssignmentList>
    </div>
</template>
