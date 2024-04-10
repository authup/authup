<script lang="ts">

import { APagination, APermissionRobotAssignments } from '@authup/client-web-kit';
import type { Permission } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
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
