/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineComponent, h } from 'vue';
import { AIdentityProviderPreset } from './AIdentityProviderPreset';
import { AIdentityProviderProtocol } from './AIdentityProviderProtocol';
import type { IdentityProviderPresetElement } from './preset';
import type { IdentityProviderProtocolElement } from './protocol';

export const AIdentityProviderIcon = defineComponent({
    props: {
        entity: {
            type: Object as PropType<IdentityProvider>,
            required: true,
        },
    },
    setup(props, setup) {
        if (props.entity.preset) {
            return () => h(AIdentityProviderPreset, {
                id: props.entity.preset,
            }, {
                default: (item: IdentityProviderPresetElement) => h('i', { class: [item.icon, setup.attrs.class] }),
            });
        }

        return () => h(AIdentityProviderProtocol, {
            id: props.entity.protocol,
        }, {
            default: (item: IdentityProviderProtocolElement) => h('i', { class: [item.icon, setup.attrs.class] }),
        });
    },
});
