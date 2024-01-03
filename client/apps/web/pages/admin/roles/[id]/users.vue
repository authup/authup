<script lang="ts">

import { ARoleUserAssignments, ListPagination } from '@authup/client-vue';
import type { Role } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: {
        ListPagination,
        RoleUserAssignmentList: ARoleUserAssignments,
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
    <RoleUserAssignmentList :entity-id="entity.id">
        <template #footer="props">
            <ListPagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </RoleUserAssignmentList>
</template>
