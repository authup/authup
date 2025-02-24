/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ResourceType } from '@authup/core-kit';
import type { ClientScope } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { ResourceVSlots } from '../utility';
import {
    createResourceManager,
    defineResourceVEmitOptions,
    defineResourceVProps,
} from '../utility';

export const AClientScope = defineComponent({
    props: defineResourceVProps<ClientScope>(),
    emits: defineResourceVEmitOptions<ClientScope>(),
    slots: Object as SlotsType<ResourceVSlots<ClientScope>>,
    async setup(props, setup) {
        const manager = createResourceManager({
            type: `${ResourceType.CLIENT_SCOPE}`,
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
