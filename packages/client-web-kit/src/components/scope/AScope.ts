/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import type { Scope } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { EntityManagerSlotsType } from '../../core';
import {
    createEntityManager,
    defineEntityManagerEvents,
    defineEntityManagerProps,
} from '../../core';

export const AScope = defineComponent({
    props: defineEntityManagerProps<Scope>(),
    emits: defineEntityManagerEvents<Scope>(),
    slots: Object as SlotsType<EntityManagerSlotsType<Scope>>,
    async setup(props, setup) {
        const manager = createEntityManager({
            type: `${DomainType.SCOPE}`,
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
