/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import type { User } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { ResourceVSlots } from '../../core';
import {
    createResourceManager,
    defineResourceVEmitOptions,
    defineResourceVProps,
} from '../../core';

export const AUser = defineComponent({
    props: defineResourceVProps<User>(),
    emits: defineResourceVEmitOptions<User>(),
    slots: Object as SlotsType<ResourceVSlots<User>>,
    async setup(props, setup) {
        const manager = createResourceManager({
            type: `${DomainType.USER}`,
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
