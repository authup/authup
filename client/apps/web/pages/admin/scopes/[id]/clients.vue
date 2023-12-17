<script lang="ts">

import { ListPagination, ScopeClientAssignmentList } from '@authup/client-vue';
import type { Scope } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        ListPagination,
        ScopeClientAssignmentList,
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
    <ScopeClientAssignmentList :entity-id="entity.id">
        <template #footer="props">
            <ListPagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </ScopeClientAssignmentList>
</template>
