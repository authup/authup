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
    IdentityProviderPreset,
} from '@authup/core';
import {
    DomainType, IdentityProviderProtocol,
} from '@authup/core';
import {
    buildFormInput,
    buildFormSubmit,
} from '@vue-layout/form-controls';
import { onChange, useIsEditing } from '../../composables';
import {
    createEntityManager,
    extractVuelidateResultsFromChild,
    injectAPIClient,
} from '../../core';
import { useTranslator } from '../../translator';
import { IdentityProviderBasicFields } from './IdentityProviderBasicFields';
import { IdentityProviderClientFields } from './IdentityProviderClientFields';
import { IdentityProviderEndpointFields } from './IdentityProviderEndpointFields';
import { IdentityProviderPresetEntity } from './IdentityProviderPresetEntity';
import { IdentityProviderProtocolEntity } from './IdentityProviderProtocolEntity';
import type { IdentityProviderPresetElement } from './preset';
import type { IdentityProviderProtocolElement } from './protocol';

export const IdentityProviderOAuth2Form = defineComponent({
    name: 'IdentityProviderOAuth2Form',
    components: {
        IdentityProviderBasicFields,
        IdentityProviderClientFields,
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
        translatorLocale: {
            type: String,
            default: undefined,
        },
        apiUrl: {
            type: String,
            default: 'http://localhost:3001',
        },
        protocol: {
            type: String as PropType<string | null>,
            default: IdentityProviderProtocol.OAUTH2,
        },
        preset: {
            type: String as PropType<string | null>,
        },
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const manager = createEntityManager(`${DomainType.IDENTITY_PROVIDER}`, {
            setup: ctx,
            props,
        });

        const protocol = computed(() => {
            if (manager.entity.value) {
                return manager.entity.value.protocol;
            }

            return props.protocol;
        });

        const preset = computed(() => {
            if (manager.entity.value) {
                return manager.entity.value.preset;
            }

            return props.preset;
        });

        const busy = ref(false);

        const $v = useVuelidate({ $stopPropagation: true });

        const isEditing = useIsEditing(manager.entity);

        const authorizeUri = computed<string>(() => {
            if (!manager.entity.value) {
                return '';
            }

            return injectAPIClient().identityProvider.getAuthorizeUri(props.apiUrl, manager.entity.value.id);
        });

        const basicFieldsNode = ref<null | typeof IdentityProviderBasicFields>(null);

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
                    !manager.entity.value &&
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

        return () => {
            let headerNode : VNodeChild;

            if (!manager.entity.value) {
                if (preset.value) {
                    headerNode = h(IdentityProviderPresetEntity, {
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
                    headerNode = h(IdentityProviderProtocolEntity, {
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
                    buildFormInput({
                        labelContent: 'Redirect URL',
                        value: authorizeUri,
                        props: {
                            disabled: true,
                        },
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
                h(IdentityProviderBasicFields, {
                    ref: basicFieldsNode,
                    entity: manager.entity.value,
                }),
            ];

            const securityNode : VNodeChild = [
                h('h6', [
                    h('i', { class: 'fa fa-lock' }),
                    ' ',
                    'Security',
                ]),
                h(IdentityProviderClientFields, {
                    entity: manager.entity.value,
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
                        IdentityProviderEndpointFields,
                        {
                            entity: manager.entity.value,
                            discovery: protocol.value === IdentityProviderProtocol.OIDC,
                        },
                    ),
                ];
            }

            const submitNode = buildFormSubmit({
                updateText: useTranslator().getSync('form.update.button', props.translatorLocale),
                createText: useTranslator().getSync('form.create.button', props.translatorLocale),
                submit,
                busy,
                isEditing: isEditing.value,
                validationResult: $v.value,
            });

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

export default IdentityProviderOAuth2Form;
