/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { Client } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { EntityManagerSlotsType } from '../../core/entity-manager';
import {
    createEntityManager,
    defineEntityManagerEvents,
    defineEntityManagerProps,
} from '../../core/entity-manager';

export const ClientEntity = defineComponent({
    name: 'ClientEntity',
    props: defineEntityManagerProps<Client>(),
    emits: defineEntityManagerEvents<Client>(),
    slots: Object as SlotsType<EntityManagerSlotsType<Client>>,
    async setup(props, setup) {
        const manager = createEntityManager({
            type: DomainType.CLIENT,
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