<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { EntityType } from '@authup/core-kit';
import type { ClientRole } from '@authup/core-kit';
import { defineComponent } from 'vue';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import AToggleButton from '../../utility/toggle-button/AToggleButton.vue';

export default defineComponent({
    components: { AToggleButton },
    props: {
        roleId: { type: String, required: true },
        clientId: { type: String, required: true },
    },
    emits: defineEntityVEmitOptions<ClientRole>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.CLIENT_ROLE}`,
            setup,
            query: () => ({
                filters: {
                    client_id: props.clientId,
                    role_id: props.roleId,
                },
            }),
            socket: {
                processEvent(event) {
                    return event.data.client_id === props.clientId &&
                        event.data.role_id === props.roleId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    client_id: props.clientId,
                    role_id: props.roleId,
                },
            },
        });

        const handleChanged = (value: boolean) => {
            if (value) {
                return manager.create({
                    client_id: props.clientId,
                    role_id: props.roleId,
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
