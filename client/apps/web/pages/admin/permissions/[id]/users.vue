<script lang="ts">
import { ListPagination, PermissionUserAssignmentList } from '@authup/client-vue';
import type { Permission } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ListPagination,
        PermissionUserAssignmentList,
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
    <PermissionUserAssignmentList :entity-id="entity.id">
        <template #footer="props">
            <ListPagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </PermissionUserAssignmentList>
</template>
