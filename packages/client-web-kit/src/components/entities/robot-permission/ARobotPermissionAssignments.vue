<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import { APermissions } from '../permission';
import ARobotPermissionAssignment from './ARobotPermissionAssignment.vue';

export default defineComponent({
    components: { APermissions, ARobotPermissionAssignment },
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
});
</script>
<template>
    <APermissions>
        <template #itemActions="{ data }">
            <ARobotPermissionAssignment
                :key="data.id"
                :robot-id="entityId"
                :permission-id="data.id"
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
    </APermissions>
</template>
