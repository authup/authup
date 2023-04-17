<script lang="ts">

import { RoleUserAssignmentList } from '@authup/client-vue';
import type { Role } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: {
        RoleUserAssignmentList,
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
    <RoleUserAssignmentList :entity-id="entity.id" />
</template>
