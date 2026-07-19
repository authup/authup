<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { EntityType } from '@authup/core-kit';
import type { UserRole } from '@authup/core-kit';
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
        userId: { type: String, required: true },
    },
    emits: defineEntityVEmitOptions<UserRole>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.USER_ROLE}`,
            setup,
            query: () => ({
                filters: {
                    userId: props.userId,
                    roleId: props.roleId,
                },
            }),
            socket: {
                processEvent(event) {
                    return event.data.roleId === props.roleId &&
                        event.data.userId === props.userId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    userId: props.userId,
                    roleId: props.roleId,
                },
            },
        });

        const handleChanged = (value: boolean) => {
            if (value) {
                return manager.create({
                    userId: props.userId,
                    roleId: props.roleId,
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
        :with-prompt="true"
        @changed="handleChanged"
    />
</template>
