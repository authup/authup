<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import { AScopes } from '../scope';
import AClientScopeAssignment from './AClientScopeAssignment.vue';

export default defineComponent({
    components: { AScopes, AClientScopeAssignment },
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
});
</script>
<template>
    <AScopes>
        <template #itemActions="{ data }">
            <AClientScopeAssignment
                :key="data.id"
                :client-id="entityId"
                :scope-id="data.id"
            />
        </template>
        <template
            v-for="(_, name) in $slots"
            :key="name"
            #[name]="slotData"
        >
            <slot
                :name="name"
                v-bind="slotData ?? {}"
            />
        </template>
    </AScopes>
</template>
