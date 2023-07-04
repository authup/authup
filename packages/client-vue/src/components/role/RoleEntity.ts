/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { Role } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { EntityManagerSlotsType } from '../../core/entity-manager';
import {
    createEntityManager,
    defineEntityManagerEvents,
    defineEntityManagerProps,
} from '../../core/entity-manager';

export const RoleEntity = defineComponent({
    name: 'RoleEntity',
    props: defineEntityManagerProps<Role>(),
    emits: defineEntityManagerEvents<Role>(),
    slots: Object as SlotsType<EntityManagerSlotsType<Role>>,
    async setup(props, setup) {
        const manager = createEntityManager({
            type: DomainType.ROLE,
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
