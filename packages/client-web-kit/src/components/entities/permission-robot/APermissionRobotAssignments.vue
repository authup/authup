<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { computed, defineComponent } from 'vue';
import ARobotPermissionAssignment from '../robot-permission/ARobotPermissionAssignment.vue';
import { ARobots } from '../robot';

export default defineComponent({
    components: { ARobots, ARobotPermissionAssignment },
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
    <ARobots>
        <template #itemActions="{ data }">
            <ARobotPermissionAssignment
                :key="data.id"
                :permission-id="entityId"
                :robot-id="data.id"
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
    </ARobots>
</template>
