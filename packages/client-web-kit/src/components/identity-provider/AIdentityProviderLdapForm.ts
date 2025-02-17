/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, LdapIdentityProvider } from '@authup/core-kit';
import { IdentityProviderProtocol, ResourceType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import {
    type PropType, type VNodeChild, defineComponent, h, ref,
} from 'vue';
import { useIsEditing } from '../../composables';
import {
    buildFormSubmitWithTranslations,
    createFormSubmitTranslations,
    createResourceManager,
    defineResourceVEmitOptions,
    extractVuelidateResultsFromChild,
} from '../../core';
import { AIdentityProviderBasicFields } from './AIdentityProviderBasicFields';
import { AIdentityProviderLdapConnectionFields } from './AIdentityProviderLdapConnectionFields';
import { AIdentityProviderLdapCredentialsFields } from './AIdentityProviderLdapCredentialsFields';
import { AIdentityProviderLdapGroupFields } from './AIdentityProviderLdapGroupFields';
import { AIdentityProviderLdapUserFields } from './AIdentityProviderLdapUserFields';
import { AIdentityProviderProtocol } from './AIdentityProviderProtocol';
import type { IdentityProviderProtocolElement } from './protocol';

export const AIdentityProviderLdapForm = defineComponent({
    props: {
        entity: {
            type: Object as PropType<IdentityProvider>,
            required: false,
            default: undefined,
        },
        realmId: {
            type: String,
            default: undefined,
        },
    },
    emits: defineResourceVEmitOptions<IdentityProvider>(),
    setup(props, ctx) {
        const manager = createResourceManager({
            type: `${ResourceType.IDENTITY_PROVIDER}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        const busy = ref(false);
        const $v = useVuelidate({ $stopPropagation: true });

        const submit = async () => {
            if ($v.value.$invalid) {
                return;
            }

            const data : Partial<IdentityProvider> = {
                ...extractVuelidateResultsFromChild($v, 'basic'),
                ...extractVuelidateResultsFromChild($v, 'connection'),
                ...extractVuelidateResultsFromChild($v, 'credentials'),
                ...extractVuelidateResultsFromChild($v, 'group'),
                ...extractVuelidateResultsFromChild($v, 'user'),
                protocol: IdentityProviderProtocol.LDAP,
            };

            await manager.createOrUpdate(data);
        };

        const submitTranslations = createFormSubmitTranslations();

        return () => {
            const submitNode = buildFormSubmitWithTranslations({
                submit,
                busy: busy.value,
                isEditing: isEditing.value,
                invalid: $v.value.$invalid,
            }, submitTranslations);

            let headerNode : VNodeChild | undefined;
            if (!manager.data.value) {
                headerNode = h(AIdentityProviderProtocol, {
                    key: IdentityProviderProtocol.LDAP,
                    id: IdentityProviderProtocol.LDAP,
                }, {
                    default: (element: IdentityProviderProtocolElement) => h('div', [
                        h('h4', { class: 'mb-3' }, [
                            h('i', { class: [element.icon, 'pe-1'] }),
                            element.name,
                        ]),
                    ]),
                });
            }

            const basicNode : VNodeChild = [
                h('h6', [
                    h('i', { class: 'fa fa-wrench' }),
                    ' ',
                    'Basic',
                ]),
                h(AIdentityProviderBasicFields, {
                    entity: manager.data.value,
                }),
            ];

            const connectionNode : VNodeChild = [
                h('h6', [
                    h('i', { class: 'fa-solid fa-vihara' }),
                    ' ',
                    'Connection',
                ]),
                h(AIdentityProviderLdapConnectionFields, {
                    entity: manager.data.value as LdapIdentityProvider,
                }),
            ];

            const credentialsNode : VNodeChild = [
                h('h6', [
                    h('i', { class: 'fa fa-lock' }),
                    ' ',
                    'Security',
                ]),
                h(AIdentityProviderLdapCredentialsFields, {
                    entity: manager.data.value as LdapIdentityProvider,
                }),
            ];

            const groupNode : VNodeChild = [
                h('h6', [
                    h('i', { class: 'fa-solid fa-theater-masks' }),
                    ' ',
                    'Group',
                ]),
                h(AIdentityProviderLdapGroupFields, {
                    entity: manager.data.value as LdapIdentityProvider,
                }),
            ];

            const userNode : VNodeChild = [
                h('h6', [
                    h('i', { class: 'fas fa-user' }),
                    ' ',
                    'User',
                ]),
                h(AIdentityProviderLdapUserFields, {
                    entity: manager.data.value as LdapIdentityProvider,
                }),
            ];

            return h('form', {
                onSubmit($event: any) {
                    $event.preventDefault();

                    return submit.call(null);
                },
            }, [
                headerNode,
                h('div', {
                    class: 'row',
                }, [
                    h('div', {
                        class: 'col',
                    }, [
                        basicNode,
                    ]),
                    h('div', {
                        class: 'col',
                    }, [
                        credentialsNode,
                    ]),
                ]),
                h('hr'),
                connectionNode,
                h('hr'),
                h('div', {
                    class: 'row',
                }, [
                    h('div', {
                        class: 'col',
                    }, [
                        userNode,
                    ]),
                    h('div', {
                        class: 'col',
                    }, [
                        groupNode,
                    ]),
                ]),
                submitNode,
            ]);
        };
    },
});
