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
import { OAuth2Provider } from '@typescript-auth/domains';
import { createNanoID, hasOwnProperty } from '../../../utils';
import { OAuth2ProviderRoleList } from '../oauth2-provider-role';
import { ComponentFormData, ComponentFormMethods } from '../../helpers';
import { buildRealmSelectForm } from '../realm/render/select';
import { buildFormInput } from '../../helpers/form/render/input';
import { buildFormSubmit } from '../../helpers/form/render';

type Properties = {
    [key: string]: any;

    entity?: OAuth2Provider,
    realmId?: string
};

export const OAuth2ProviderForm = Vue.extend<
ComponentFormData<OAuth2Provider>,
ComponentFormMethods<OAuth2Provider>,
any,
Properties
>({
    name: 'OAuth2ProviderForm',
    components: { OAuth2ProviderRoleList },
    props: {
        entity: {
            type: Object as PropType<OAuth2Provider>,
            required: false,
            default: undefined,
        },
        realmId: {
            type: String,
            default: null,
        },
    },
    data() {
        return {
            form: {
                name: '',
                open_id: false,
                token_host: '',
                token_path: '',
                authorize_host: '',
                authorize_path: '',
                scope: '',
                client_id: '',
                client_secret: '',
                realm_id: '',
            },
            schemes: [
                {
                    id: 'oauth2',
                    name: 'OAuth2',
                },
                {
                    id: 'openid',
                    name: 'Open ID',
                },
            ],
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
                maxLength: maxLength(36),
            },
            open_id: {
                required,
            },
            token_host: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(512),
            },
            token_path: {
                minLength: minLength(5),
                maxLength: maxLength(256),
            },
            authorize_host: {
                minLength: minLength(5),
                maxLength: maxLength(512),
            },
            authorize_path: {
                minLength: minLength(5),
                maxLength: maxLength(256),
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
            realm_id: {
                required,
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
        isNameEmpty() {
            return !this.form.name || this.form.name.length === 0;
        },
    },
    created() {
        if (this.realmId) {
            this.form.realm_id = this.realmId;
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const key in this.form) {
            if (hasOwnProperty(this.entity, key)) {
                this.form[key] = this.entity[key];
            }
        }

        if (this.isNameEmpty) {
            this.generateID();
        }
    },
    methods: {
        async submit() {
            if (this.busy || this.$v.$invalid) {
                return;
            }

            this.busy = true;

            try {
                let response;

                if (this.isEditing) {
                    response = await this.$authApi.oauth2Provider.update(this.entity.id, this.form);

                    this.$emit('updated', response);
                } else {
                    response = await this.$authApi.oauth2Provider.create(this.form);

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
            this.form.name = createNanoID();
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        let realm = h();

        if (vm.isRealmLocked) {
            realm = buildRealmSelectForm(vm, h, {
                propName: 'realm_id',
            });
        }

        const openID = h('div', {
            staticClass: 'form-group mb-1',
        }, [
            h('b-form-checkbox', {
                model: {
                    value: vm.form.open_id,
                    callback(v: boolean) {
                        vm.form.open_id = v;
                    },
                    expression: 'form.open_id',
                },
            } as VNodeData, [
                'Enabled?',
            ]),
            h('div', {
                staticClass: 'alert alert-sm alert-info mt-1',
            }, [
                'If enabled the server will try to pull additional information from the authentication server.',
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
                    title: 'Name',
                    propName: 'name',
                }),
                h('div', {
                    staticClass: 'alert alert-sm',
                    class: {
                        'alert-warning': vm.isNameEmpty,
                        'alert-success': !vm.isNameEmpty,
                    },
                }, [
                    h('button', {
                        staticClass: 'btn btn-xs btn-dark',
                        on: {
                            click($event: any) {
                                $event.preventDefault();

                                vm.generateID.call(null);
                            },
                        },
                    }),
                ]),
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
                    title: 'Client ID',
                    propName: 'client_id',
                }),
                buildFormInput(vm, h, {
                    title: 'Client Secret',
                    propName: 'client_secret',
                }),
            ]),
        ]);

        const secondRow = h('div', [
            h('div', {
                staticClass: 'col',
            }, [
                h('h6', [
                    h('i', { staticClass: 'fa fa-link' }),
                    ' ',
                    'Token',
                ]),
                buildFormInput(vm, h, {
                    title: 'Token Host',
                    propName: 'token_host',
                    inputAttrs: {
                        placeholder: 'https://...',
                    },
                }),
                buildFormInput(vm, h, {
                    title: [
                        h('Token Path (optional)'),
                        ' ',
                        h('small', {
                            staticClass: 'text-success',
                        }, [
                            'default: ',
                            '"oauth/token"',
                        ]),
                    ],
                    propName: 'token_path',
                    inputAttrs: {
                        placeholder: 'path/...',
                    },
                }),
            ]),
            h('div', {
                staticClass: 'col',
            }, [
                h('h6', [
                    h('i', { staticClass: 'fa fa-link' }),
                    ' ',
                    'Authorization',
                ]),
                buildFormInput(vm, h, {
                    title: [
                        h('Authorization Host (optional)'),
                        ' ',
                        h('small', {
                            staticClass: 'text-success',
                        }, [
                            'default: ',
                            'Token Host',
                        ]),
                    ],
                    propName: 'authorize_host',
                    inputAttrs: {
                        placeholder: 'https://...',
                    },
                }),
                buildFormInput(vm, h, {
                    title: [
                        h('Authorization Path (optional)'),
                        ' ',
                        h('small', {
                            staticClass: 'text-success',
                        }, [
                            'default: ',
                            '"oauth/authorize"',
                        ]),
                    ],
                    propName: 'authorize_path',
                    inputAttrs: {
                        placeholder: 'path/...',
                    },
                }),
            ]),
        ]);

        let roleList = h();

        if (vm.entity) {
            roleList = h('div', [
                h('h6', [
                    h('i', { staticClass: 'fa fa-users' }),
                    ' ',
                    'Roles',
                ]),
                h(OAuth2ProviderRoleList, {
                    props: {
                        entityId: vm.entity.id,
                    },
                }),
                h('hr'),
            ]);
        }

        const submit = buildFormSubmit(this, h);

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
            secondRow,
            h('hr'),
            roleList, // roleList will provide hr
            submit,
        ]);
    },
});

export default OAuth2ProviderForm;
