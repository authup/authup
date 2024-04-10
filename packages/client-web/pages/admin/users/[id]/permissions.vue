<script lang="ts">
import { APagination, AUserPermissionAssignments } from '@authup/client-web-kit';
import type { User } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';
import { resolveComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        APagination,
        AUserPermissionAssignments,
    },
    props: {
        entity: {
            type: Object as PropType<User>,
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
    <AUserPermissionAssignments :entity-id="entity.id">
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </AUserPermissionAssignments>
</template>
