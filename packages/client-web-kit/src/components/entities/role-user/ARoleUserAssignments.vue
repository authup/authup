<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import { AUserRoleAssignment } from '../user-role';
import { AUsers } from '../user/AUsers';

export default defineComponent({
    components: { AUsers, AUserRoleAssignment },
    props: { entityId: String },
});
</script>
<template>
    <AUsers>
        <template #itemActions="{ data }">
            <AUserRoleAssignment
                :key="data.id"
                :role-id="entityId"
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
