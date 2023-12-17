<script lang="ts">

import { ListPagination, RolePermissionAssignmentList } from '@authup/client-vue';
import type { Role } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: {
        ListPagination,
        RolePermissionAssignmentList,
    },
    props: {
        entity: {
            type: Object as PropType<Role>,
            required: true,
        },
    },
});
</script>
<template>
    <RolePermissionAssignmentList :entity-id="entity.id">
        <template #footer="props">
            <ListPagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </RolePermissionAssignmentList>
</template>
