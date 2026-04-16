<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { AUserRoleAssignment } from '../user-role';
import { AUsers } from '../user/AUsers';

export default defineComponent({
    components: { AUsers, AUserRoleAssignment },
    props: { entityId: { type: String, required: true } },
    setup(props, { slots }) {
        const forwardedSlots = computed(() => {
            const { itemActions, ...rest } = slots;
            return rest;
        });
        return { forwardedSlots };
    },
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
            v-for="(_, name) in forwardedSlots"
            :key="name"
            #[name]="slotData"
        >
            <slot                :name="name"
                v-bind="slotData ?? {}"
            />
        </template>
    </AUsers>
</template>
