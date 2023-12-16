<script lang="ts">
import { PermissionRoleAssignmentList } from '@authup/client-vue';
import type { Permission } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        PermissionRoleAssignmentList,
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
    <PermissionRoleAssignmentList :entity-id="entity.id" />
</template>
