/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ResourceType } from '@authup/core-kit';
import type { Realm } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { ResourceVSlots } from '../utility';
import {
    createResourceManager,
    defineResourceVEmitOptions,
    defineResourceVProps,
} from '../utility';

export const ARealm = defineComponent({
    props: defineResourceVProps<Realm>(),
    emits: defineResourceVEmitOptions<Realm>(),
    slots: Object as SlotsType<ResourceVSlots<Realm>>,
    async setup(props, setup) {
        const manager = createResourceManager({
            type: `${ResourceType.REALM}`,
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
