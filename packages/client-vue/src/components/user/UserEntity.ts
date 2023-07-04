/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { User } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { EntityManagerSlotsType } from '../../core';
import {
    createEntityManager,
    defineEntityManagerEvents,
    defineEntityManagerProps,
} from '../../core';

export const UserEntity = defineComponent({
    name: 'UserEntity',
    props: defineEntityManagerProps<User>(),
    emits: defineEntityManagerEvents<User>(),
    slots: Object as SlotsType<EntityManagerSlotsType<User>>,
    async setup(props, setup) {
        const manager = createEntityManager({
            type: DomainType.USER,
            props,
            setup,
        });

        try {
            await manager.resolveOrFail();

            return () => manager.render();
        } catch (e) {
            return () => manager.render(e);
        }
    },
});
