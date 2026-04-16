<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { computed, defineComponent } from 'vue';
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
    setup(props, { slots }) {
        const forwardedSlots = computed(() => Object.fromEntries(Object.entries(slots).filter(([name]) => name !== 'itemActions')));
        return { forwardedSlots };
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
            v-for="(_, name) in forwardedSlots"
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
