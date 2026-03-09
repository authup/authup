<script lang="ts">

import { APagination, AScopeClientAssignments, ASearch } from '@authup/client-web-kit';
import type { Scope } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ASearch,
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
        <template #header="props">
            <ASearch
                :load="props.load"
                :meta="props.meta"
            />
        </template>
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </AScopeClientAssignments>
</template>
