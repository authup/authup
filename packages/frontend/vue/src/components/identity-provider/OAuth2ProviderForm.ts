/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, {
    CreateElement, PropType, VNode, VNodeData,
} from 'vue';
import { maxLength, minLength, required } from 'vuelidate/lib/validators';
import { IdentityProviderProtocol, OAuth2IdentityProvider, createNanoID } from '@authelion/common';
import {
    ComponentFormData,
    ComponentFormMethods,
    buildFormInput,
    buildFormSubmit,
} from '@vue-layout/utils';
import { alphaNumHyphenUnderscore, initPropertiesFromSource, useHTTPClient } from '../../utils';
import { OAuth2ProviderRoleAssignmentList } from '../oauth2-provider-role';
import { buildRealmSelectForm } from '../realm/render/select';
import { useAuthIlingo } from '../../language/singleton';
import { buildVuelidateTranslator } from '../../language/utils';

type Properties = {
    [key: string]: any;

    entity?: OAuth2IdentityProvider,
    realmId?: string,
    translatorLocale?: string
};

export const OAuth2ProviderForm = Vue.extend<
ComponentFormData<OAuth2IdentityProvider>,
ComponentFormMethods<OAuth2IdentityProvider>,
any,
Properties
>({
    name: 'OAuth2ProviderForm',
    components: { OAuth2ProviderRoleList: OAuth2ProviderRoleAssignmentList },
    props: {
        entity: {
            type: Object as PropType<OAuth2IdentityProvider>,
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
    },
    data() {
        return {
            form: {
                name: '',
                slug: '',
                protocol: IdentityProviderProtocol.OAUTH2,
                enabled: true,
                realm_id: '',

                token_url: '',
                authorize_url: '',
                scope: '',
                client_id: '',
                client_secret: '',
            },
            realm: {
                items: [],
                busy: false,
            },

            busy: false,
        };
    },
    validations: {
        form: {
            name: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(128),
            },
            slug: {
                required,
                alphaNumHyphenUnderscore,
                minLength: minLength(3),
                maxLength: maxLength(36),
            },
            enabled: {
                required,
            },
            realm_id: {
                required,
            },

            token_url: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(2000),
            },
            authorize_url: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(2000),
            },
            scope: {
                minLength: minLength(3),
                maxLength: maxLength(512),
            },
            client_id: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            client_secret: {
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
        },
    },
    computed: {
        isEditing() {
            return this.entity &&
                Object.prototype.hasOwnProperty.call(this.entity, 'id');
        },
        isRealmLocked() {
            return !!this.realmId;
        },
        isSlugEmpty() {
            return !this.form.slug || this.form.slug.length === 0;
        },
        isNameEmpty() {
            return !this.form.name || this.form.name.length === 0;
        },
        updatedAt() {
            return this.entity ? this.entity.updated_at : undefined;
        },
    },
    watch: {
        updatedAt(val, oldVal) {
            if (val && val !== oldVal) {
                this.initFromProperties();
            }
        },
    },
    created() {
        this.initFromProperties();
    },
    methods: {
        initFromProperties() {
            if (this.realmId) {
                this.form.realm_id = this.realmId;
            }

            if (this.entity) {
                initPropertiesFromSource<OAuth2IdentityProvider>(this.entity, this.form);
            }

            if (this.isSlugEmpty) {
                this.generateID();
            }
        },
        async submit() {
            if (this.busy || this.$v.$invalid) {
                return;
            }

            this.busy = true;

            try {
                let response;

                if (this.isEditing) {
                    response = await useHTTPClient().identityProvider.update(this.entity.id, this.form);

                    this.$emit('updated', response);
                } else {
                    response = await useHTTPClient().identityProvider.create(this.form);

                    this.$emit('created', response);
                }
            } catch (e) {
                if (e instanceof Error) {
                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
        generateID() {
            const isSame : boolean = this.form.slug === this.form.name ||
                (this.isSlugEmpty && this.isNameEmpty);

            this.form.slug = createNanoID();
            if (isSame) {
                this.form.name = this.form.slug;
            }
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        let realm = h();

        if (!vm.isRealmLocked) {
            realm = buildRealmSelectForm(vm, h, {
                propName: 'realm_id',
                value: vm.form.realm_id,
            });
        }

        const openID = h('div', {
            staticClass: 'form-group mb-1',
        }, [
            h('b-form-checkbox', {
                model: {
                    value: vm.form.enabled,
                    callback(v: boolean) {
                        vm.form.enabled = v;
                    },
                    expression: 'form.enabled',
                },
            } as VNodeData, [
                'Enabled?',
            ]),
        ]);

        const firstRow = h('div', {
            staticClass: 'row',
        }, [
            h('div', {
                staticClass: 'col',
            }, [
                h('h6', [
                    h('i', { staticClass: 'fa fa-wrench' }),
                    ' ',
                    'Configuration',
                ]),
                buildFormInput(vm, h, {
                    validationTranslator: buildVuelidateTranslator(vm.translatorLocale),
                    title: 'Slug',
                    propName: 'slug',
                }),
                h('div', {
                    staticClass: 'mb-3',
                }, [
                    h('button', {
                        staticClass: 'btn btn-xs btn-dark',
                        on: {
                            click($event: any) {
                                $event.preventDefault();

                                vm.generateID.call(null);
                            },
                        },
                    }, [
                        h('i', { staticClass: 'fa fa-wrench' }),
                        ' ',
                        'Generate',
                    ]),
                ]),
                buildFormInput(vm, h, {
                    validationTranslator: buildVuelidateTranslator(vm.translatorLocale),
                    title: 'Name',
                    propName: 'name',
                }),
                realm,
                openID,
            ]),
            h('div', {
                staticClass: 'col',
            }, [
                h('h6', [
                    h('i', { staticClass: 'fa fa-lock' }),
                    ' ',
                    'Security',
                ]),
                buildFormInput(vm, h, {
                    validationTranslator: buildVuelidateTranslator(vm.translatorLocale),
                    title: 'Client ID',
                    propName: 'client_id',
                }),
                buildFormInput(vm, h, {
                    validationTranslator: buildVuelidateTranslator(vm.translatorLocale),
                    title: 'Client Secret',
                    propName: 'client_secret',
                }),
            ]),
        ]);

        const thirdRow = h(
            'div',
            {
                staticClass: 'row',
            },
            [
                h('div', {
                    staticClass: 'col',
                }, [
                    h('h6', [
                        h('i', { staticClass: 'fa-solid fa-key' }),
                        ' ',
                        'Token',
                    ]),
                    buildFormInput(vm, h, {
                        validationTranslator: buildVuelidateTranslator(vm.translatorLocale),
                        title: 'Endpoint',
                        propName: 'token_url',
                        attrs: {
                            placeholder: 'https://...',
                        },
                    }),
                ]),
                h('div', {
                    staticClass: 'col',
                }, [
                    h('h6', [
                        h('i', { staticClass: 'fa-solid fa-vihara' }),
                        ' ',
                        'Authorization',
                    ]),
                    buildFormInput(vm, h, {
                        validationTranslator: buildVuelidateTranslator(vm.translatorLocale),
                        title: 'Endpoint',
                        propName: 'authorize_url',
                        attrs: {
                            placeholder: vm.$v.form.token_url.$model || 'https://...',
                        },
                    }),
                ]),
            ],
        );

        let roleList = h();

        if (vm.entity) {
            roleList = h('div', [
                h('h6', [
                    h('i', { staticClass: 'fa fa-users' }),
                    ' ',
                    'Roles',
                ]),
                h(OAuth2ProviderRoleAssignmentList, {
                    props: {
                        entityId: vm.entity.id,
                    },
                }),
                h('hr'),
            ]);
        }

        const submit = buildFormSubmit(this, h, {
            updateText: useAuthIlingo().getSync('form.update.button', vm.translatorLocale),
            createText: useAuthIlingo().getSync('form.create.button', vm.translatorLocale),
        });

        return h('form', {
            on: {
                submit($event: any) {
                    $event.preventDefault();

                    return vm.submit.call(null);
                },
            },
        }, [
            firstRow,
            h('hr'),
            thirdRow,
            h('hr'),
            roleList, // roleList will provide hr
            submit,
        ]);
    },
});

export default OAuth2ProviderForm;
