<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import { ARoles } from '../role';
import AUserRoleAssignment from './AUserRoleAssignment.vue';

export default defineComponent({
    components: { ARoles, AUserRoleAssignment },
    props: { entityId: { type: String, required: true } },
});
</script>
<template>
    <ARoles>
        <template #itemActions="{ data }">
            <AUserRoleAssignment
                :key="data.id"
                :user-id="entityId"
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
