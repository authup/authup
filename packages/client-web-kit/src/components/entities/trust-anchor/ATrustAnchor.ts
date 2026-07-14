/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TrustAnchor } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { EntityVSlots } from '../../utility';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
    defineEntityVProps,
} from '../../utility';

export const ATrustAnchor = defineComponent({
    props: defineEntityVProps<TrustAnchor>(),
    emits: defineEntityVEmitOptions<TrustAnchor>(),
    slots: Object as SlotsType<EntityVSlots<TrustAnchor>>,
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.TRUST_ANCHOR}`,
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
