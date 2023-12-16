<script lang="ts">

import { RobotPermissionAssignmentList } from '@authup/client-vue';
import type { Robot } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        RobotPermissionAssignmentList,
    },
    props: {
        entity: {
            type: Object as PropType<Robot>,
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
    <RobotPermissionAssignmentList :entity-id="entity.id" />
</template>
