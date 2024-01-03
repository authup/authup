<script lang="ts">

import { AUserRoleAssignments, ListPagination } from '@authup/client-vue';
import type { User } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: {
        ListPagination,
        UserRoleAssignmentList: AUserRoleAssignments,
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
    <UserRoleAssignmentList :entity-id="entity.id">
        <template #footer="props">
            <ListPagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </UserRoleAssignmentList>
</template>
