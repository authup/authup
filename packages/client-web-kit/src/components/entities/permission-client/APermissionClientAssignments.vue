<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
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
            v-for="(_, name) in $slots"
            :key="name"
            #[name]="slotData"
        >
            <slot
                :name="name"
                v-bind="slotData ?? {}"
            />
        </template>
    </AClients>
</template>
