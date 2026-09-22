/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import {
    defineEntityPicker,
    defineEntityPickerVEmitOptions,
    defineEntityPickerVProps,
} from '../../utility/entity/picker/module';
import type { EntityPickerVSlots } from '../../utility/entity/picker/types';
import { APaths } from './APaths';

export const APathPicker = defineComponent({
    props: defineEntityPickerVProps<Path>(),
    emits: defineEntityPickerVEmitOptions<Path>(),
    slots: Object as SlotsType<EntityPickerVSlots<Path>>,
    setup(props, setup) {
        const { render } = defineEntityPicker({
            component: APaths,
            props,
            setup,
        });

        return () => render();
    },
});
