<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { EntityType } from '@authup/core-kit';
import type { UserPermission } from '@authup/core-kit';
import { computed, defineComponent } from 'vue';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import AToggleButton from '../../utility/toggle-button/AToggleButton.vue';
import { APermissionPolicyBindingButton } from '../permission-policy-binding';

export default defineComponent({
    components: { AToggleButton, APermissionPolicyBindingButton },
    props: {
        userId: { type: String, required: true },
        permissionId: { type: String, required: true },
    },
    emits: defineEntityVEmitOptions<UserPermission>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: EntityType.USER_PERMISSION,
            setup,
            query: () => ({
                filters: {
                    userId: props.userId,
                    permissionId: props.permissionId,
                },
            }),
            socket: {
                processEvent(event) {
                    return event.data.permissionId === props.permissionId &&
                        event.data.userId === props.userId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    userId: props.userId,
                    permissionId: props.permissionId,
                },
            },
        });

        const handleChanged = (value: boolean) => {
            if (value) {
                return manager.create({
                    userId: props.userId,
                    permissionId: props.permissionId,
                });
            }

            return manager.delete();
        };

        const handleCreated = (entity: UserPermission) => {
            manager.created(entity);
        };

        const handleUpdated = (entity: UserPermission) => {
            manager.updated(entity);
        };

        // The existing junction in edit mode, else a stable create template (FK base) carrying
        // no id → the binding control treats it as create mode. Memoized so the template keeps a
        // stable reference while unassigned.
        const bindingEntity = computed<Partial<UserPermission>>(() => manager.data.value || {
            userId: props.userId,
            permissionId: props.permissionId,
        });

        return {
            manager,
            handleChanged,
            handleCreated,
            handleUpdated,
            bindingEntity,
            EntityType,
        };
    },
});
</script>
<template>
    <span class="flex gap-1">
        <AToggleButton
            :value="!!manager.data.value"
            :is-busy="manager.busy.value"
            :with-prompt="true"
            @changed="handleChanged"
        />
        <APermissionPolicyBindingButton
            :key="manager.data.value?.id || 'create'"
            :entity-type="EntityType.USER_PERMISSION"
            :entity="bindingEntity"
            @created="handleCreated"
            @updated="handleUpdated"
        />
    </span>
</template>
