/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import {
    defineComponent,
} from 'vue';
import {
    defineEntityPicker,
    defineEntityPickerVEmitOptions,
    defineEntityPickerVProps,
} from '../../utility/entity/picker/module';
import type { EntityPickerVSlots } from '../../utility/entity/picker/types';
import { ARealms } from './ARealms';

export const ARealmPicker = defineComponent({
    props: defineEntityPickerVProps<Realm>(),
    emits: defineEntityPickerVEmitOptions<Realm>(),
    slots: Object as SlotsType<EntityPickerVSlots<Realm>>,
    setup(props, setup) {
        const { render } = defineEntityPicker({
            component: ARealms,
            props,
            setup,
        });

        return () => render();
    },
});
