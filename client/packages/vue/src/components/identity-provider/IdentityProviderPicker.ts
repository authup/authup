/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderPreset, IdentityProviderProtocol, getIdentityProviderProtocolForPreset } from '@authup/core';
import { buildList } from '@vuecs/list-controls';
import { defineComponent, h } from 'vue';
import type { IdentityProviderPresetElement } from './preset';
import { IdentityProviderPresetEntity } from './IdentityProviderPresetEntity';
import { IdentityProviderProtocolEntity } from './IdentityProviderProtocolEntity';
import type { IdentityProviderProtocolElement } from './protocol';

export const IdentityProviderPicker = defineComponent({
    props: {
        protocol: {
            type: String,
        },
        preset: {
            type: String,
        },
    },
    emits: ['pick'],
    setup(props, setup) {
        const protocols : Record<string, any>[] = [];
        const presets : Record<string, any>[] = [];

        Object.values(IdentityProviderProtocol)
            .map((id) => { protocols.push({ id }); return id; });

        Object.values(IdentityProviderPreset)
            .map((id) => { presets.push({ id }); return id; });

        const pick = (ctx: {protocol?: string, preset?: string}) => {
            setup.emit('pick', ctx);
        };

        return () => {
            const protocolNode = buildList({
                data: protocols,
                header: {
                    content: h('h6', 'Protocols'),
                },
                body: {
                    class: 'd-flex flex-row',
                    item: {
                        class: [
                            'me-1 list-item',
                        ],
                        icon: false,
                        content: (item) => h(IdentityProviderProtocolEntity, {
                            id: item.id,
                        }, {
                            default: (element: IdentityProviderProtocolElement) => [
                                h('i', { class: [element.icon, 'pe-1'] }),
                                element.name,
                                h('button', {
                                    class: 'btn btn-xs btn-dark ms-1',
                                    onClick($event: any) {
                                        $event.preventDefault();

                                        pick({ protocol: item.id });
                                    },
                                }, [
                                    h('i', { class: 'fa fa-plus' }),
                                ]),
                            ],
                        }),
                    },
                },
            });

            const protocolNodeConfigurationNode = buildList({
                data: presets,
                header: {
                    content: h('h6', 'Presets'),
                },
                body: {
                    class: 'd-flex flex-row',
                    item: {
                        class: 'me-1 list-item',
                        icon: false,
                        content: (preset) => h(IdentityProviderPresetEntity, {
                            id: preset.id,
                        }, {
                            default: (item: IdentityProviderPresetElement) => h('div', [
                                h('i', { class: [item.icon, 'pe-1'] }),
                                item.name,
                                h('button', {
                                    class: 'btn btn-xs btn-dark ms-1',
                                    onClick($event: any) {
                                        $event.preventDefault();

                                        pick({
                                            preset: preset.id,
                                            protocol: getIdentityProviderProtocolForPreset(preset.id),
                                        });
                                    },
                                }, [
                                    h('i', { class: 'fa fa-plus' }),
                                ]),
                            ]),
                        }),
                    },
                },
            });

            return [
                protocolNode,
                protocolNodeConfigurationNode,
            ];
        };
    },
});
