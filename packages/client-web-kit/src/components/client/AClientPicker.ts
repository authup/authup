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
    defineResourcePicker,
    defineResourcePickerVEmitOptions,
    defineResourcePickerVProps,
} from '../utility/resource-picker/module';
import type { ResourcePickerVSlots } from '../utility/resource-picker/types';
import { AClients } from './AClients';

export const AClientPicker = defineComponent({
    props: defineResourcePickerVProps<Client>(),
    emits: defineResourcePickerVEmitOptions<Client>(),
    slots: Object as SlotsType<ResourcePickerVSlots<Client>>,
    setup(props, setup) {
        const { render } = defineResourcePicker({
            component: AClients,
            props,
            setup,
        });

        return () => render();
    },
});
