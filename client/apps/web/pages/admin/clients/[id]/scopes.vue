<script lang="ts">
import { ClientScopeAssignmentList } from '@authup/client-vue';
import type { Client } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ClientScopeAssignmentList,
    },
    props: {
        entity: {
            type: Object as PropType<Client>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props) {
        return {
            entity: props.entity,
        };
    },
});
</script>
<template>
    <ClientScopeAssignmentList :entity-id="entity.id" />
</template>
