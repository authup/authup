/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { IdentityProvider } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { EntityVSlots } from '../../utility';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
    defineEntityVProps,
} from '../../utility';

export const AIdentityProvider = defineComponent({
    props: defineEntityVProps<IdentityProvider>(),
    emits: defineEntityVEmitOptions<IdentityProvider>(),
    slots: Object as SlotsType<EntityVSlots<IdentityProvider>>,
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.IDENTITY_PROVIDER}`,
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
