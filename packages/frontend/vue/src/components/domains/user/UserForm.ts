/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    email, maxLength, minLength, required,
} from 'vuelidate/lib/validators';
import Vue, {
    CreateElement, PropType, VNode, VNodeData,
} from 'vue';

import { Realm, User } from '@typescript-auth/domains';
import { ComponentFormData } from '../../type';
import { FormGroup, FormGroupSlotScope } from '../../core';
import { RealmList } from '../realm';
import { ComponentListData } from '../../helpers';

export type Properties = {
    [key: string]: any;

    entity?: Partial<User>,
    realmId?: string
};

type Data = {
    displayNameChanged: boolean,

} & ComponentFormData<User>;

export const UserForm = Vue.extend<Data, any, any, Properties>({
    name: 'UserForm',
    props: {
        entity: {
            type: Object as PropType<Partial<User>>,
            default: undefined,
        },
        realmId: {
            type: String,
            default: undefined,
        },
    },
    data() {
        return {
            form: {
                active: false,
                name: '',
                display_name: '',
                email: '',
                realm_id: '',
            },

            busy: false,

            displayNameChanged: false,
        };
    },
    validations: {
        form: {
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            display_name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            email: {
                minLength: minLength(5),
                maxLength: maxLength(255),
                email,
            },
            realm_id: {
                required,
            },
        },
    },
    computed: {
        isRealmLocked() {
            return !!this.realmId;
        },
        isEditing() {
            return typeof this.entity !== 'undefined' &&
                Object.prototype.hasOwnProperty.call(this.entity, 'id');
        },
        isNameLocked() {
            if (!this.entity) {
                return false;
            }

            return !!this.entity.name_locked;
        },
    },
    created() {
        if (typeof this.realmId !== 'undefined') {
            this.form.realm_id = this.realmId;
        }

        const keys = Object.keys(this.form);
        if (typeof this.entity !== 'undefined') {
            for (let i = 0; i < keys.length; i++) {
                if (Object.prototype.hasOwnProperty.call(this.entity, keys[i])) {
                    this.form[keys[i]] = this.entity[keys[i]];
                }
            }
        }
    },
    methods: {
        getModifiedFields() {
            if (typeof this.entity === 'undefined') {
                return Object.keys(this.form);
            }

            const fields : (keyof User)[] = [];

            const keys : (keyof User)[] = Object.keys(this.form) as (keyof User)[];

            for (let i = 0; i < keys.length; i++) {
                if (
                    Object.prototype.hasOwnProperty.call(this.form, keys[i]) &&
                    this.entity[keys[i]] !== this.form[keys[i]]
                ) {
                    fields.push(keys[i]);
                }
            }

            return fields;
        },
        async submit() {
            if (this.busy) {
                return;
            }

            this.busy = true;

            try {
                const fields = this.getModifiedFields();

                if (fields.length > 0) {
                    const properties : Record<string, any> = {};

                    for (let i = 0; i < fields.length; i++) {
                        properties[fields[i]] = this.form[fields[i]];
                    }

                    if (this.isEditing) {
                        const user = await this.$authApi.user.update(this.entity.id, { ...properties });

                        this.$bvToast.toast('The user was successfully updated.', {
                            variant: 'success',
                            toaster: 'b-toaster-top-center',
                        });

                        this.$emit('updated', user);
                    } else {
                        const user = await this.$authApi.user.create(properties);

                        this.$bvToast.toast('The realm was successfully created.', {
                            variant: 'success',
                            toaster: 'b-toaster-top-center',
                        });

                        this.$emit('created', user);
                    }
                }
            } catch (e) {
                if (e instanceof Error) {
                    this.$bvToast.toast(e.message, {
                        variant: 'warning',
                        toaster: 'b-toaster-top-center',
                    });

                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
        updateDisplayName(value: string) {
            if (!this.displayNameChanged) {
                this.form.display_name = value;
            }
        },
        handleDisplayNameChanged(value: string) {
            this.displayNameChanged = value.length !== 0;
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        let realm = h();
        if (!vm.isRealmLocked) {
            realm = h(FormGroup, {
                props: {
                    validations: vm.$v.form.realm_id,
                },
                scopedSlots: {
                    default: (props: FormGroupSlotScope) => h('div', {
                        staticClass: 'form-group',
                        class: {
                            'form-group-error': vm.$v.form.realm_id.$error,
                            'form-group-warning': vm.$v.form.realm_id.$invalid && !vm.$v.form.realm_id.$dirty,
                        },
                    }, [
                        h('label', ['Realm']),
                        h(RealmList, {
                            props: {
                                withSearch: false,
                                withHeader: false,
                            },
                            slot: 'items',
                            scopedSlots: {
                                items: (propsItemsSlot: Partial<ComponentListData<Realm>>) => h(
                                    'select',
                                    {
                                        staticClass: 'form-control',
                                        attrs: {
                                            disabled: propsItemsSlot.busy,
                                        },
                                        on: {
                                            change($event: any) {
                                                const $$selectedVal = Array.prototype.filter.call($event.target.options, (o) => o.selected).map((o) => ('_value' in o ? o._value : o.value));

                                                vm.$set(vm.$v.form.realm_id, '$model', $event.target.multiple ? $$selectedVal : $$selectedVal[0]);
                                            },
                                        },
                                    },
                                    [
                                        h('option', {
                                            domProps: { value: '' },
                                        }, ['-- Select option --']),
                                        propsItemsSlot.items?.map((item: Realm) => h('option', {
                                            key: item.id,
                                            domProps: {
                                                value: item.id,
                                            },
                                        }, [item.name])),
                                    ],
                                ),
                            },
                        }),
                        props.errors.map((error) => h('div', {
                            staticClass: 'form-group-hint group-required',
                        }, [error])),
                    ]),
                },
            });
        }

        const name = h(FormGroup, {
            props: {
                validations: vm.$v.form.name,
            },
            scopedSlots: {
                default: (props: FormGroupSlotScope) => h(
                    'div',
                    {
                        staticClass: 'form-group',
                        class: {
                            'form-group-error': vm.$v.form.name.$error,
                            'form-group-warning': vm.$v.form.name.$invalid && !vm.$v.form.name.$dirty,
                        },
                    },
                    [
                        h('label', ['Name']),
                        h('input', {
                            attrs: {
                                type: 'text',
                                placeholder: '...',
                                disabled: vm.isNameLocked,
                            },
                            domProps: {
                                value: vm.$v.form.name.$model,
                            },
                            staticClass: 'form-control',
                            on: {
                                input($event: any) {
                                    if ($event.target.composing) {
                                        return;
                                    }

                                    vm.$set(vm.$v.form.name, '$model', $event.target.value);
                                    vm.updateDisplayName($event.target.value);
                                },
                            },
                        }),
                        props.errors.map((error) => h('div', {
                            staticClass: 'form-group-hint group-required',
                        }, [error])),
                    ],
                ),
            },
        });

        const displayName = h(FormGroup, {
            props: {
                validations: vm.$v.form.display_name,
            },
            scopedSlots: {
                default: (props: FormGroupSlotScope) => h(
                    'div',
                    {
                        staticClass: 'form-group',
                        class: {
                            'form-group-error': vm.$v.form.display_name.$error,
                            'form-group-warning': vm.$v.form.display_name.$invalid && !vm.$v.form.display_name.$dirty,
                        },
                    },
                    [
                        h('label', ['Display Name']),
                        h('input', {
                            attrs: {
                                type: 'text',
                                placeholder: '...',
                            },
                            domProps: {
                                value: vm.$v.form.display_name.$model,
                            },
                            staticClass: 'form-control',
                            on: {
                                input($event: any) {
                                    if ($event.target.composing) {
                                        return;
                                    }

                                    vm.$set(vm.$v.form.display_name, '$model', $event.target.value);
                                    vm.handleDisplayNameChanged($event.target.value);
                                },
                            },
                        }),
                        props.errors.map((error) => h('div', {
                            staticClass: 'form-group-hint group-required',
                        }, [error])),
                    ],
                ),
            },
        });

        const email = h(FormGroup, {
            props: {
                validations: vm.$v.form.email,
            },
            scopedSlots: {
                default: (props: FormGroupSlotScope) => h(
                    'div',
                    {
                        staticClass: 'form-group',
                        class: {
                            'form-group-error': vm.$v.form.email.$error,
                            'form-group-warning': vm.$v.form.email.$invalid && !vm.$v.form.email.$dirty,
                        },
                    },
                    [
                        h('label', ['Email']),
                        h('input', {
                            attrs: {
                                type: 'email',
                                placeholder: '...@...',
                            },
                            domProps: {
                                value: vm.$v.form.email.$model,
                            },
                            staticClass: 'form-control',
                            on: {
                                input($event: any) {
                                    if ($event.target.composing) {
                                        return;
                                    }

                                    vm.$set(vm.$v.form.email, '$model', $event.target.value);
                                },
                            },
                        }),
                        props.errors.map((error) => h('div', {
                            staticClass: 'form-group-hint group-required',
                        }, [error])),
                    ],
                ),
            },
        });

        const activate = h('div', {
            staticClass: 'form-group mb-1',
        }, [
            h('b-form-checkbox', {
                attrs: {
                    switch: '',
                },
                model: {
                    value: vm.form.active,
                    callback(v: boolean) {
                        vm.form.active = v;
                    },
                    expression: 'form.active',
                },
            } as VNodeData, [
                h('span', {
                    class: {
                        'text-warning': !vm.form.active,
                        'text-success': vm.form.active,
                    },
                }, [vm.form.active ? 'active' : 'inactive']),
            ]),
        ]);

        const submit = h('div', {
            staticClass: 'form-group',
        }, [
            h('button', {
                staticClass: 'btn btn-xs',
                class: {
                    'btn-primary': vm.isEditing,
                    'btn-success': !vm.isEditing,
                },
                attrs: {
                    disabled: vm.$v.form.$invalid || vm.busy,
                    type: 'button',
                },
                on: {
                    click($event: any) {
                        $event.preventDefault();

                        return vm.submit.apply(null);
                    },
                },
            }, [
                h('i', {
                    class: {
                        'fa fa-save': vm.isEditing,
                        'fa fa-plus': !vm.isEditing,
                    },
                }),
                ' ',
                (vm.isEditing ? 'Update' : 'Create'),
            ]),
        ]);

        return h('form', {
            on: {
                submit($event: any) {
                    $event.preventDefault();

                    return vm.submit.apply(null);
                },
            },
        }, [
            realm,
            name,
            displayName,
            email,
            activate,
            submit,
        ]);
    },
});

export default UserForm;
