<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { EntityType } from '@authup/core-kit';
import type { RolePermission } from '@authup/core-kit';
import { defineComponent } from 'vue';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import AToggleButton from '../../utility/toggle-button/AToggleButton.vue';
import { APermissionPolicyBindingButton } from '../permission-policy-binding';

export default defineComponent({
    components: { AToggleButton, APermissionPolicyBindingButton },
    props: {
        roleId: { type: String, required: true },
        permissionId: { type: String, required: true },
    },
    emits: defineEntityVEmitOptions<RolePermission>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.ROLE_PERMISSION}`,
            setup,
            query: () => ({
                filters: {
                    role_id: props.roleId,
                    permission_id: props.permissionId,
                },
            }),
            socket: {
                processEvent(event) {
                    return event.data.role_id === props.roleId &&
                        event.data.permission_id === props.permissionId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    role_id: props.roleId,
                    permission_id: props.permissionId,
                },
            },
        });

        const handleChanged = (value: boolean) => {
            if (value) {
                return manager.create({
                    role_id: props.roleId,
                    permission_id: props.permissionId,
                });
            }

            return manager.delete();
        };

        const handleUpdated = (entity: RolePermission) => {
            manager.updated(entity);
        };

        return {
            manager,
            handleChanged,
            handleUpdated,
            EntityType,
        };
    },
});
</script>
<template>
    <span class="d-flex gap-1">
        <AToggleButton
            :value="!!manager.data.value"
            :is-busy="manager.busy.value"
            @changed="handleChanged"
        />
        <APermissionPolicyBindingButton
            v-if="manager.data.value"
            :key="manager.data.value.id"
            :entity-type="EntityType.ROLE_PERMISSION"
            :entity="manager.data.value"
            @updated="handleUpdated"
        />
    </span>
</template>
