/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent } from 'vue';
import { getIdentityProviderPresetElement } from './preset';
import { hasNormalizedSlot, normalizeSlot } from '../../core';

export const IdentityProviderPresetEntity = defineComponent({
    name: 'IdentityProviderPresetEntity',
    props: {
        id: {
            type: String,
            required: true,
        },
    },
    setup(props, setup) {
        const preset = getIdentityProviderPresetElement(props.id);
        if (preset) {
            if (hasNormalizedSlot('default', setup.slots)) {
                return () => normalizeSlot('default', preset, setup.slots);
            }
        } else if (hasNormalizedSlot('error', setup.slots)) {
            return () => normalizeSlot('error', {}, setup.slots);
        }

        return () => [];
    },
});
