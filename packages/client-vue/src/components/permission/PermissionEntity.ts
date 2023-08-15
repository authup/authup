/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import type { Permission } from '@authup/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { EntityManagerSlotsType } from '../../core';
import {
    createEntityManager,
    defineEntityManagerEvents,
    defineEntityManagerProps,
} from '../../core';

export const PermissionEntity = defineComponent({
    name: 'PermissionEntity',
    props: defineEntityManagerProps<Permission>(),
    emits: defineEntityManagerEvents<Permission>(),
    slots: Object as SlotsType<EntityManagerSlotsType<Permission>>,
    async setup(props, setup) {
        const manager = createEntityManager({
            type: `${DomainType.PERMISSION}`,
            setup,
            props,
        });

        try {
            await manager.resolveOrFail();

            return () => manager.render();
        } catch (e) {
            return () => manager.renderError(e);
        }
    },
});
