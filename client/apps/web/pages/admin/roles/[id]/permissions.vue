<script lang="ts">

import { RolePermissionAssignmentList } from '@authup/client-vue';
import type { Role } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: {
        RolePermissionAssignmentList,
    },
    props: {
        entity: {
            type: Object as PropType<Role>,
            required: true,
        },
    },
    setup(props) {
        return {
            enttiy: props.entity,
        };
    },
});
</script>
<template>
    <RolePermissionAssignmentList :entity-id="entity.id" />
</template>
