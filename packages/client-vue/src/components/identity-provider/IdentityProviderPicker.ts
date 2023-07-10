/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderProtocol, IdentityProviderProtocolConfig } from '@authup/core';
import { buildList } from '@vue-layout/list-controls';
import * as stream from 'stream';
import { defineComponent, h } from 'vue';

export const IdentityProviderPicker = defineComponent({
    name: 'IdentityProviderPicker',
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
        const protocols = [
            { id: IdentityProviderProtocol.OIDC, name: 'OpenID Connect' },
            { id: IdentityProviderProtocol.OAUTH2, name: 'OAuth2' },
        ];

        const protocolConfigurations = [
            {
                id: IdentityProviderProtocolConfig.FACEBOOK, protocol: IdentityProviderProtocol.OIDC, name: 'Facebook', icon: 'fab fa-facebook',
            },
            {
                id: IdentityProviderProtocolConfig.GITHUB, protocol: IdentityProviderProtocol.OIDC, name: 'GitHub', icon: 'fab fa-github',
            },
            {
                id: IdentityProviderProtocolConfig.GITLAB, protocol: IdentityProviderProtocol.OIDC, name: 'GitLab', icon: 'fab fa-gitlab',
            },
            {
                id: IdentityProviderProtocolConfig.GOOGLE, protocol: IdentityProviderProtocol.OIDC, name: 'Google', icon: 'fab fa-google',
            },
            {
                id: IdentityProviderProtocolConfig.PAYPAL, protocol: IdentityProviderProtocol.OIDC, name: 'Paypal', icon: 'fab fa-paypal',
            },
            {
                id: IdentityProviderProtocolConfig.INSTAGRAM, protocol: IdentityProviderProtocol.OIDC, name: 'Instagram', icon: 'fab fa-instagram',
            },
            {
                id: IdentityProviderProtocolConfig.STACKOVERFLOW, protocol: IdentityProviderProtocol.OIDC, name: 'StackOverflow', icon: 'fa fa-code',
            },
            {
                id: IdentityProviderProtocolConfig.TWITTER, protocol: IdentityProviderProtocol.OIDC, name: 'Twitter', icon: 'fab fa-twitter',
            },
        ];

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
                        content: (item) => [
                            item.name,
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
                    },
                },
            });

            const protocolNodeConfigurationNode = buildList({
                data: protocolConfigurations,
                header: {
                    content: h('h6', 'Presets'),
                },
                body: {
                    class: 'd-flex flex-row',
                    item: {
                        class: 'me-1 list-item',
                        icon: false,
                        content: (item) => h('div', [
                            h('i', { class: [item.icon, 'pe-1'] }),
                            item.name,
                            h('button', {
                                class: 'btn btn-xs btn-dark ms-1',
                                onClick($event: any) {
                                    $event.preventDefault();

                                    pick({ preset: item.id, protocol: item.protocol });
                                },
                            }, [
                                h('i', { class: 'fa fa-plus' }),
                            ]),
                        ]),
                    },
                },
            });

            return [
                protocolNode,
                h('hr'),
                protocolNodeConfigurationNode,
            ];
        };
    },
});
