/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    maxLength, minLength, required, sameAs,
} from 'vuelidate/lib/validators';
import Vue, {
    CreateElement, VNode, VNodeData,
} from 'vue';
import { User } from '@typescript-auth/domains';
import { buildFormInput } from '../../helpers/form/render/input';
import { ComponentFormData } from '../../helpers';
import { useHTTPClient } from '../../../utils';

type Properties = {
    [key: string]: any;

    id: User['id']
};

export const UserPasswordForm = Vue.extend<ComponentFormData<User>, any, any, Properties>({
    name: 'UserPasswordForm',
    props: {
        id: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            form: {
                password: '',
                password_repeat: '',
                passwordShow: false,
            },

            message: null,
            busy: false,
        };
    },
    validations: {
        form: {
            password: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(100),
            },
            password_repeat: {
                minLength: minLength(5),
                maxLength: maxLength(100),
                sameAs: sameAs('password'),
            },
        },
    },
    methods: {
        async submit() {
            if (this.busy) return;

            this.busy = true;

            try {
                const user = await useHTTPClient().user.update(this.id, {
                    password: this.form.password,
                    password_repeat: this.form.password_repeat,
                });

                this.$bvToast.toast('The user password was successfully updated.', {
                    variant: 'success',
                    toaster: 'b-toaster-top-center',
                });

                this.$emit('updated', user);
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
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        const password = buildFormInput<User>(this, h, {
            title: 'Password',
            propName: 'password',
            attrs: {
                type: vm.form.passwordShow ? 'text' : 'password',
                autocomplete: 'new-password',
            },
        });

        const passwordRepeat = buildFormInput(this, h, {
            title: 'Password repeat',
            propName: 'password_repeat',
            attrs: {
                type: vm.form.passwordShow ? 'text' : 'password',
                autocomplete: 'new-password',
            },
        });

        const showPassword = h('div', {
            staticClass: 'form-group mb-1',
        }, [
            h('b-form-checkbox', {
                attrs: {
                    switch: '',
                },
                model: {
                    value: vm.form.passwordShow,
                    callback(v: boolean) {
                        vm.form.passwordShow = v;
                    },
                    expression: 'form.passwordShow',
                },
            } as VNodeData, [
                'Password ',
                (vm.form.passwordShow ? 'hide' : 'show'),
            ]),
        ]);

        const submit = h('div', {
            staticClass: 'form-group',
        }, [
            h('button', {
                staticClass: 'btn btn-primary btn-xs',
                attrs: {
                    disabled: vm.$v.form.$invalid || vm.busy,
                    type: 'button',
                },
                domProps: {
                    disabled: vm.$v.form.$invalid || vm.busy,
                },
                on: {
                    click($event: any) {
                        $event.preventDefault();

                        return vm.submit.apply(null);
                    },
                },
            }, [
                h('i', {
                    staticClass: 'fa fa-save',
                }),
                ' ',
                'Update',
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
            password,
            passwordRepeat,
            showPassword,
            submit,
        ]);
    },
});

export default UserPasswordForm;
