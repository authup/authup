<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import ARobotRoleAssignment from '../robot-role/ARobotRoleAssignment.vue';
import { ARobots } from '../robot';

export default defineComponent({
    components: { ARobots, ARobotRoleAssignment },
    props: { entityId: String },
});
</script>
<template>
    <ARobots>
        <template #itemActions="{ data }">
            <ARobotRoleAssignment
                :key="data.id"
                :role-id="entityId"
                :robot-id="data.id"
            />
        </template>
    </ARobots>
</template>
