<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { computed, defineComponent } from 'vue';
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
    setup(props, { slots }) {
        const forwardedSlots = computed(() => {
            const { itemActions, ...rest } = slots;
            return rest;
        });
        return { forwardedSlots };
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
            v-for="(_, name) in forwardedSlots"
            :key="name"
            #[name]="slotData"
        >
            <slot                :name="name"
                v-bind="slotData ?? {}"
            />
        </template>
    </AScopes>
</template>
