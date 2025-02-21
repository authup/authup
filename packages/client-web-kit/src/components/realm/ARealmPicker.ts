/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import {
    defineComponent,
} from 'vue';
import { AEntityPicker, defineEntityPickerVProps } from '../AEntityPicker';

export const ARealmPicker = defineComponent({
    extends: AEntityPicker,
    props: defineEntityPickerVProps<Realm>(),
    setup(props, setup) {
        return AEntityPicker.setup!({
            ...props,
            componentName: 'ARealms',
        }, setup);
    },
});
