<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { EntityType } from '@authup/core-kit';
import type { ClientScope } from '@authup/core-kit';
import { defineComponent } from 'vue';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import AToggleButton from '../../utility/toggle-button/AToggleButton.vue';

export default defineComponent({
    components: { AToggleButton },
    props: {
        clientId: { type: String, required: true },
        scopeId: { type: String, required: true },
    },
    emits: defineEntityVEmitOptions<ClientScope>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.CLIENT_SCOPE}`,
            setup,
            query: () => ({
                filters: {
                    clientId: props.clientId,
                    scopeId: props.scopeId,
                },
            }),
            socket: {
                processEvent(event) {
                    return event.data.clientId === props.clientId &&
                        event.data.scopeId === props.scopeId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    clientId: props.clientId,
                    scopeId: props.scopeId,
                },
            },
        });

        const handleChanged = (value: boolean) => {
            if (value) {
                return manager.create({
                    clientId: props.clientId,
                    scopeId: props.scopeId,
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
