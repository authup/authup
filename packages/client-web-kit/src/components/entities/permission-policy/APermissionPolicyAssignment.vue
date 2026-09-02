<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { EntityType } from '@authup/core-kit';
import type { PermissionPolicy } from '@authup/core-kit';
import { defineComponent } from 'vue';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import AToggleButton from '../../utility/toggle-button/AToggleButton.vue';

export default defineComponent({
    components: { AToggleButton },
    props: {
        permissionId: {
            type: String,
            required: true,
        },
        policyId: {
            type: String,
            required: true,
        },
    },
    emits: defineEntityVEmitOptions<PermissionPolicy>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: EntityType.PERMISSION_POLICY,
            setup,
            query: () => ({
                filters: {
                    permissionId: props.permissionId,
                    policyId: props.policyId,
                },
            }),
            socket: {
                processEvent(event) {
                    return event.data.permissionId === props.permissionId &&
                        event.data.policyId === props.policyId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    permissionId: props.permissionId,
                    policyId: props.policyId,
                },
            },
        });

        const handleChanged = (value: boolean) => {
            if (value) {
                return manager.create({
                    permissionId: props.permissionId,
                    policyId: props.policyId,
                });
            }

            return manager.delete();
        };

        return {
            manager,
            handleChanged,
        };
    },
});
</script>
<template>
    <AToggleButton
        :value="!!manager.data.value"
        :is-busy="manager.busy.value"
        @changed="handleChanged"
    />
</template>
