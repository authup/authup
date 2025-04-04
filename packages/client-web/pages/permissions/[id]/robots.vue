<script lang="ts">

import { APagination, APermissionRobotAssignments, ASearch } from '@authup/client-web-kit';
import type { Permission } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ASearch,
        APagination,
        APermissionRobotAssignments,
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
        <APermissionRobotAssignments :entity-id="entity.id">
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
        </APermissionRobotAssignments>
    </div>
</template>
