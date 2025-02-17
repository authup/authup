/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ResourceType } from '@authup/core-kit';
import type { IdentityProvider } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { ResourceVSlots } from '../../core';
import {
    createResourceManager,
    defineResourceVEmitOptions,
    defineResourceVProps,
} from '../../core';

export const AIdentityProvider = defineComponent({
    props: defineResourceVProps<IdentityProvider>(),
    emits: defineResourceVEmitOptions<IdentityProvider>(),
    slots: Object as SlotsType<ResourceVSlots<IdentityProvider>>,
    async setup(props, setup) {
        const manager = createResourceManager({
            type: `${ResourceType.IDENTITY_PROVIDER}`,
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
