/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
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
import { AClients } from './AClients';

export const AClientPicker = defineComponent({
    props: defineEntityPickerVProps<Client>(),
    emits: defineEntityPickerVEmitOptions<Client>(),
    slots: Object as SlotsType<EntityPickerVSlots<Client>>,
    setup(props, setup) {
        const { render } = defineEntityPicker({
            component: AClients,
            props,
            setup,
        });

        return () => render();
    },
});
