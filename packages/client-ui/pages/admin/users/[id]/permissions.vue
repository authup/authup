<script lang="ts">
import { UserPermissionAssignmentList } from '@authup/client-vue';
import type { User } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';
import { resolveComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        UserPermissionAssignmentList,
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
    <UserPermissionAssignmentList :entity-id="entity.id" />
</template>
