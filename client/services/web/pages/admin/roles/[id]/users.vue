<script lang="ts">

import { APagination, ARoleUserAssignments } from '@authup/client-vue';
import type { Role } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: {
        APagination,
        ARoleUserAssignments,
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
    <ARoleUserAssignments :entity-id="entity.id">
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </ARoleUserAssignments>
</template>
