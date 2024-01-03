<script lang="ts">
import { AUserPermissionAssignments, APagination } from '@authup/client-vue';
import type { User } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';
import { resolveComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ListPagination: APagination,
        UserPermissionAssignmentList: AUserPermissionAssignments,
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
    <UserPermissionAssignmentList :entity-id="entity.id">
        <template #footer="props">
            <ListPagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </UserPermissionAssignmentList>
</template>
