<script lang="ts">

import { APagination, AScopeClientAssignments } from '@authup/client-web-kit';
import type { Scope } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        APagination,
        AScopeClientAssignments,
    },
    props: {
        entity: {
            type: Object as PropType<Scope>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
});
</script>
<template>
    <AScopeClientAssignments :entity-id="entity.id">
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </AScopeClientAssignments>
</template>
