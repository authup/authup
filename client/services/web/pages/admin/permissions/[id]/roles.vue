<script lang="ts">
import { APagination, APermissionRoleAssignments } from '@authup/client-vue';
import type { Permission } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        APagination,
        APermissionRoleAssignments,
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
    <APermissionRoleAssignments :entity-id="entity.id">
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </APermissionRoleAssignments>
</template>
