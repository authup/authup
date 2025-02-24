/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderProtocol } from '@authup/core-kit';
import { defineComponent } from 'vue';
import { hasNormalizedSlot, normalizeSlot } from '../../../core';
import { getIdentityProviderProtocolElement } from './protocol';

export const AIdentityProviderProtocol = defineComponent({
    props: {
        id: {
            type: String,
            required: true,
        },
    },
    setup(props, setup) {
        const preset = getIdentityProviderProtocolElement(props.id as IdentityProviderProtocol);
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
