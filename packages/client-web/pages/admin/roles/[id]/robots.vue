<script lang="ts">

import { APagination, ARoleRobotAssignments } from '@authup/client-web-kit';
import type { Role } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: {
        APagination,
        ARoleRobotAssignments,
    },
    props: {
        entity: {
            type: Object as PropType<Role>,
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
    <ARoleRobotAssignments :entity-id="entity.id">
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </ARoleRobotAssignments>
</template>
