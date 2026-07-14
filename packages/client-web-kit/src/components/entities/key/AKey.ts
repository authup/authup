/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { Key } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { EntityVSlots } from '../../utility';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
    defineEntityVProps,
} from '../../utility';

export const AKey = defineComponent({
    props: defineEntityVProps<Key>(),
    emits: defineEntityVEmitOptions<Key>(),
    slots: Object as SlotsType<EntityVSlots<Key>>,
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.KEY}`,
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
