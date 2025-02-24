/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { Permission } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { EntityVSlots } from '../../utility';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
    defineEntityVProps,
} from '../../utility';

export const APermission = defineComponent({
    props: defineEntityVProps<Permission>(),
    emits: defineEntityVEmitOptions<Permission>(),
    slots: Object as SlotsType<EntityVSlots<Permission>>,
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.PERMISSION}`,
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
