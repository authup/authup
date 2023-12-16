<script lang="ts">

import { UserRoleAssignmentList } from '@authup/client-vue';
import type { User } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: {
        UserRoleAssignmentList,
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
    <UserRoleAssignmentList :entity-id="entity.id" />
</template>
