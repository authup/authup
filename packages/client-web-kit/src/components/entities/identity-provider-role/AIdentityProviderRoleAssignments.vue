<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { computed, defineComponent } from 'vue';
import AIdentityProviderRoleAssignment from './AIdentityProviderRoleAssignment.vue';
import { ARoles } from '../role';

export default defineComponent({
    components: { ARoles, AIdentityProviderRoleAssignment },
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        const forwardedSlots = computed(() => Object.fromEntries(Object.entries(slots).filter(([name]) => name !== 'body')));
        return { forwardedSlots };
    },
});
</script>
<template>
    <ARoles :header-title="false">
        <template #body="slotProps">
            <AIdentityProviderRoleAssignment
                v-for="item in slotProps.data"
                :key="item.id"
                :entity-id="entityId"
                :role="item"
            />
        </template>
        <template
            v-for="(_, name) in forwardedSlots"
            :key="name"
            #[name]="slotData"
        >
            <slot
                :name="name"
                v-bind="slotData ?? {}"
            />
        </template>
    </ARoles>
</template>
