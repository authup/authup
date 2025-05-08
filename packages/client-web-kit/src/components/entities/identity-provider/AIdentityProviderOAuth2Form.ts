/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import useVuelidate from '@vuelidate/core';
import type {
    PropType,
    VNodeArrayChildren, VNodeChild,
} from 'vue';
import {
    computed,
    defineComponent,
    h, nextTick,
    ref,
} from 'vue';
import type {
    IdentityProvider,
    IdentityProviderPreset, OAuth2IdentityProvider,
} from '@authup/core-kit';
import {
    EntityType, IdentityProviderProtocol,
} from '@authup/core-kit';
import {
    buildFormGroup,
    buildFormInput,
} from '@vuecs/form-controls';
import { onChange, useIsEditing } from '../../../composables';
import {
    buildFormSubmitWithTranslations,
    createFormSubmitTranslations,
    extractVuelidateResultsFromChild,
    injectHTTPClient,
} from '../../../core';
import {
    defineEntityManager, defineEntityVEmitOptions,
} from '../../utility';
import { AIdentityProviderBasicFields } from './AIdentityProviderBasicFields';
import { AIdentityProviderOAuth2ClientFields } from './AIdentityProviderOAuth2ClientFields';
import { AIdentityProviderOAuth2EndpointFields } from './AIdentityProviderOAuth2EndpointFields';
import { AIdentityProviderPreset } from './AIdentityProviderPreset';
import { AIdentityProviderProtocol } from './AIdentityProviderProtocol';
import type { IdentityProviderPresetElement } from './preset';
import type { IdentityProviderProtocolElement } from './protocol';

export const AIdentityProviderOAuth2Form = defineComponent({
    components: {
        IdentityProviderBasicFields: AIdentityProviderBasicFields,
        IdentityProviderClientFields: AIdentityProviderOAuth2ClientFields,
    },
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
        protocol: {
            type: String as PropType<string | null>,
            default: IdentityProviderProtocol.OAUTH2,
        },
        preset: {
            type: String as PropType<string | null>,
        },
    },
    emits: defineEntityVEmitOptions<IdentityProvider>(),
    setup(props, ctx) {
        const apiClient = injectHTTPClient();
        const manager = defineEntityManager({
            type: `${EntityType.IDENTITY_PROVIDER}`,
            setup: ctx,
            props,
        });

        const protocol = computed(() => {
            if (manager.data.value) {
                return manager.data.value.protocol;
            }

            return props.protocol;
        });

        const preset = computed(() => {
            if (manager.data.value) {
                return manager.data.value.preset;
            }

            return props.preset;
        });

        const busy = ref(false);

        const $v = useVuelidate({ $stopPropagation: true });

        const isEditing = useIsEditing(manager.data);

        const authorizeUri = computed<string>(() => {
            if (!manager.data.value) {
                return '';
            }

            return apiClient.identityProvider.getAuthorizeUri(manager.data.value.id);
        });

        const basicFieldsNode = ref<null | typeof AIdentityProviderBasicFields>(null);

        onChange(preset, () => {
            if (!basicFieldsNode.value) {
                return;
            }

            if (preset.value) {
                basicFieldsNode.value.assign({
                    name: preset.value,
                    slug: preset.value,
                });

                return;
            }

            basicFieldsNode.value.assign({
                name: '',
                slug: '',
            });
        });
        function initForm() {
            nextTick(() => {
                if (
                    !manager.data.value &&
                    preset.value &&
                    basicFieldsNode.value
                ) {
                    basicFieldsNode.value.assign({
                        name: preset.value,
                        slug: preset.value,
                    });
                }
            });
        }

        initForm();

        const submit = async () => {
            if ($v.value.$invalid) {
                return;
            }

            const data : Partial<IdentityProvider> = {
                ...extractVuelidateResultsFromChild($v, 'basic'),
                ...extractVuelidateResultsFromChild($v, 'client'),
                ...extractVuelidateResultsFromChild($v, 'endpoint'),
            };

            if (protocol.value) {
                data.protocol = protocol.value as IdentityProviderProtocol;
            }

            if (preset.value) {
                data.preset = preset.value as IdentityProviderPreset;
            }

            await manager.createOrUpdate(data);
        };

        const submitTranslations = createFormSubmitTranslations();

        return () => {
            let headerNode : VNodeChild;

            if (!manager.data.value) {
                if (preset.value) {
                    headerNode = h(AIdentityProviderPreset, {
                        key: preset.value,
                        id: preset.value,
                    }, {
                        default: (element: IdentityProviderPresetElement) => h('div', [
                            h('h4', { class: 'mb-3' }, [
                                h('i', { class: [element.icon, 'pe-1'] }),
                                element.name,
                            ]),
                        ]),
                    });
                } else {
                    headerNode = h(AIdentityProviderProtocol, {
                        key: protocol.value,
                        id: protocol.value,
                    }, {
                        default: (element: IdentityProviderProtocolElement) => h('div', [
                            h('h4', { class: 'mb-3' }, [
                                h('i', { class: [element.icon, 'pe-1'] }),
                                element.name,
                            ]),
                        ]),
                    });
                }
            }

            let detailsNode : VNodeArrayChildren = [];
            if (isEditing.value) {
                detailsNode = [
                    h('h6', [
                        h('i', { class: 'fas fa-info-circle' }),
                        ' ',
                        'Details',
                    ]),
                    buildFormGroup({
                        label: true,
                        labelContent: 'Redirect URL',
                        content: buildFormInput({
                            value: authorizeUri,
                            props: {
                                disabled: true,
                            },
                        }),
                    }),
                    h('hr'),
                ];
            }

            const basicNode : VNodeChild = [
                h('h6', [
                    h('i', { class: 'fa fa-wrench' }),
                    ' ',
                    'Basic',
                ]),
                h(AIdentityProviderBasicFields, {
                    ref: basicFieldsNode,
                    entity: manager.data.value,
                }),
            ];

            const securityNode : VNodeChild = [
                h('h6', [
                    h('i', { class: 'fa fa-lock' }),
                    ' ',
                    'Security',
                ]),
                h(AIdentityProviderOAuth2ClientFields, {
                    entity: manager.data.value as OAuth2IdentityProvider,
                }),
            ];

            let endpointsNode : VNodeChild;
            if (!preset.value) {
                endpointsNode = [
                    h('h6', [
                        h('i', { class: 'fa-solid fa-vihara' }),
                        ' ',
                        'Endpoints',
                    ]),
                    h(
                        AIdentityProviderOAuth2EndpointFields,
                        {
                            entity: manager.data.value as OAuth2IdentityProvider,
                            discovery: protocol.value === IdentityProviderProtocol.OIDC,
                        },
                    ),
                ];
            }

            const submitNode = buildFormSubmitWithTranslations({
                submit,
                busy: busy.value,
                isEditing: isEditing.value,
                invalid: $v.value.$invalid,
            }, submitTranslations);

            return h('form', {
                onSubmit($event: any) {
                    $event.preventDefault();

                    return submit.call(null);
                },
            }, [
                headerNode,
                detailsNode,
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
                        securityNode,
                    ]),
                ]),
                h('hr'),
                endpointsNode,
                submitNode,
            ]);
        };
    },
});

export default AIdentityProviderOAuth2Form;
