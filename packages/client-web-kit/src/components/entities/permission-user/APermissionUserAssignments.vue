<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import { AUserPermissionAssignment } from '../user-permission';
import { AUsers } from '../user';

export default defineComponent({
    components: { AUsers, AUserPermissionAssignment },
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
});
</script>
<template>
    <AUsers>
        <template #itemActions="{ data }">
            <AUserPermissionAssignment
                :key="data.id"
                :permission-id="entityId"
                :user-id="data.id"
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
    </AUsers>
</template>
