<script lang="ts">

import { PermissionRobotAssignmentList } from '@authup/client-vue';
import type { Permission } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        PermissionRobotAssignmentList,
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
    <div>
        <PermissionRobotAssignmentList :entity-id="entity.id" />
    </div>
</template>
