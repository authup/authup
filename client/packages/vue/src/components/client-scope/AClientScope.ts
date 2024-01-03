/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { ClientScope } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { EntityManagerSlotsType } from '../../core';
import {
    createEntityManager,
    defineEntityManagerEvents,
    defineEntityManagerProps,
} from '../../core';

export const AClientScope = defineComponent({
    props: defineEntityManagerProps<ClientScope>(),
    emits: defineEntityManagerEvents<ClientScope>(),
    slots: Object as SlotsType<EntityManagerSlotsType<ClientScope>>,
    async setup(props, setup) {
        const manager = createEntityManager({
            type: `${DomainType.CLIENT_SCOPE}`,
            props,
            setup,
        });

        try {
            await manager.resolveOrFail();

            return () => manager.render();
        } catch (e) {
            return () => manager.renderError(e);
        }
    },
});
