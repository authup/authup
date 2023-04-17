<script lang="ts">

import { ScopeClientAssignmentList } from '@authup/client-vue';
import type { Scope } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ScopeClientAssignmentList,
    },
    props: {
        entity: {
            type: Object as PropType<Scope>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        return {
            entity: props.entity,
        };
    },
});
</script>
<template>
    <ScopeClientAssignmentList :entity-id="entity.id" />
</template>
