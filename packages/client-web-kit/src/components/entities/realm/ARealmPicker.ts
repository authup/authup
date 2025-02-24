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
    defineResourcePicker,
    defineResourcePickerVEmitOptions,
    defineResourcePickerVProps,
} from '../../utility/resource/picker/module';
import type { ResourcePickerVSlots } from '../../utility/resource/picker/types';
import { ARealms } from './ARealms';

export const ARealmPicker = defineComponent({
    props: defineResourcePickerVProps<Realm>(),
    emits: defineResourcePickerVEmitOptions<Realm>(),
    slots: Object as SlotsType<ResourcePickerVSlots<Realm>>,
    setup(props, setup) {
        const { render } = defineResourcePicker({
            component: ARealms,
            props,
            setup,
        });

        return () => render();
    },
});
