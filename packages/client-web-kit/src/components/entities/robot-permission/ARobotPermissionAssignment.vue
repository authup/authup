<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { EntityType } from '@authup/core-kit';
import type { RobotPermission } from '@authup/core-kit';
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
        robotId: { type: String, required: true },
        permissionId: { type: String, required: true },
    },
    emits: defineEntityVEmitOptions<RobotPermission>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.ROBOT_PERMISSION}`,
            setup,
            query: () => ({
                filters: {
                    robot_id: props.robotId,
                    permission_id: props.permissionId,
                },
            }),
            socket: {
                processEvent(event) {
                    return event.data.permission_id === props.permissionId &&
                        event.data.robot_id === props.robotId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    robot_id: props.robotId,
                    permission_id: props.permissionId,
                },
            },
        });

        const handleChanged = (value: boolean) => {
            if (value) {
                return manager.create({
                    robot_id: props.robotId,
                    permission_id: props.permissionId,
                });
            }

            return manager.delete();
        };

        const handleUpdated = (entity: RobotPermission) => {
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
            :entity-type="EntityType.ROBOT_PERMISSION"
            :entity="manager.data.value"
            @updated="handleUpdated"
        />
    </span>
</template>
