<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import { ARoles } from '../role';
import ARobotRoleAssignment from './ARobotRoleAssignment.vue';

export default defineComponent({
    components: { ARoles, ARobotRoleAssignment },
    props: { entityId: String },
});
</script>
<template>
    <ARoles>
        <template #itemActions="{ data }">
            <ARobotRoleAssignment
                :key="data.id"
                :robot-id="entityId"
                :role-id="data.id"
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
    </ARoles>
</template>
