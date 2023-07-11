/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core';
import type { PropType } from 'vue';
import { defineComponent, h } from 'vue';
import { IdentityProviderPresetEntity } from './IdentityProviderPresetEntity';
import { IdentityProviderProtocolEntity } from './IdentityProviderProtocolEntity';
import type { IdentityProviderPresetElement } from './preset';
import type { IdentityProviderProtocolElement } from './protocol';

export const IdentityProviderIcon = defineComponent({
    name: 'IdentityProviderIcon',
    props: {
        entity: {
            type: Object as PropType<IdentityProvider>,
            required: true,
        },
    },
    setup(props, setup) {
        if (props.entity.protocol_config) {
            return () => h(IdentityProviderPresetEntity, {
                id: props.entity.protocol_config,
            }, {
                default: (item: IdentityProviderPresetElement) => h('i', { class: [item.icon, setup.attrs.class] }),
            });
        }

        return () => h(IdentityProviderProtocolEntity, {
            id: props.entity.protocol,
        }, {
            default: (item: IdentityProviderProtocolElement) => h('i', { class: [item.icon, setup.attrs.class] }),
        });
    },
});