<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { AClients } from '../client';
import { AClientPermissionAssignment } from '../client-permission';

export default defineComponent({
    components: { AClients, AClientPermissionAssignment },
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        const forwardedSlots = computed(() => {
            return Object.fromEntries(Object.entries(slots).filter(([name]) => name !== 'itemActions'));
        });
        return { forwardedSlots };
    },
});
</script>
<template>
    <AClients>
        <template #itemActions="{ data }">
            <AClientPermissionAssignment
                :key="data.id"
                :permission-id="entityId"
                :client-id="data.id"
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
    </AClients>
</template>
