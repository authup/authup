/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, {
    CreateElement, PropType, VNode, VNodeData,
} from 'vue';
import {
    maxLength, minLength, required,
} from 'vuelidate/lib/validators';
import { Robot } from '@typescript-auth/domains';
import { ComponentFormData, buildFormInput, buildFormSubmit } from '@vue-layout/utils';
import {
    createNanoID, useHTTPClient,
} from '../../../utils';
import { alphaWithUpperNumHyphenUnderScore } from '../../utils/vuelidate';
import { initPropertiesFromSource } from '../../utils/proprety';
import { buildRealmSelectForm } from '../realm/render/select';
import { useAuthIlingo } from '../../language/singleton';

type Properties = {
    [key: string]: any;

    name?: string,
    entity?: Robot
};

// Data, Methods, Computed, Props
export const RobotForm = Vue.extend<
ComponentFormData<Robot>,
any,
any,
Properties
>({
    name: 'RobotForm',
    props: {
        name: {
            type: String,
            default: undefined,
        },
        entity: {
            type: Object as PropType<Robot>,
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
                name: '',
                realm_id: '',
                secret: '',
            },
            busy: false,
            loaded: false,

            secretChange: false,
        };
    },
    validations: {
        form: {
            name: {
                alphaWithUpperNumHyphenUnderScore,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            realm_id: {
                required,
            },
            secret: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
        },
    },
    computed: {
        isNameFixed() {
            return !!this.name &&
                this.name.length > 0;
        },
        isEditing() {
            return this.entity &&
                Object.prototype.hasOwnProperty.call(this.entity, 'id');
        },
        isRealmLocked() {
            return !!this.realmId;
        },
        isSecretEmpty() {
            return !this.form.secret || this.form.secret.length === 0;
        },
        isSecretHashed() {
            return this.entity &&
                this.entity.secret === this.form.secret &&
                this.form.secret.startsWith('$');
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
        Promise.resolve()
            .then(this.initFromProperties);
    },
    methods: {
        initFromProperties() {
            if (this.name) {
                this.form.name = this.name;
            }

            if (this.realmId) {
                this.form.realm_id = this.realmId;
            }

            if (this.entity) {
                initPropertiesFromSource<Robot>(this.entity, this.form);
            }

            if (this.form.secret.length === 0) {
                this.generateSecret();
            }
        },
        generateSecret() {
            this.form.secret = createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_!.', 64);
        },

        async submit() {
            if (this.busy || this.$v.$invalid) return;

            this.busy = true;

            try {
                let response;

                if (this.isEditing) {
                    const { secret, ...form } = this.form;

                    response = await useHTTPClient().robot.update(this.entity.id, {
                        ...form,
                        ...(this.isSecretHashed || !this.secretChange ? { } : { secret }),
                    });

                    this.$emit('updated', response);
                } else {
                    response = await useHTTPClient().robot.create({
                        ...this.form,
                    });

                    this.$emit('created', response);
                }
            } catch (e) {
                if (e instanceof Error) {
                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
        handleSecretChanged() {
            this.secretHashed = this.entity && this.form.secret === this.entity.secret;
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        let realm = h();
        if (
            !vm.isRealmLocked
        ) {
            realm = buildRealmSelectForm(vm, h, {
                propName: 'realm_id',
                value: vm.$v.form.realm_id.$model,
            });
        }

        const name = buildFormInput(this, h, {
            ilingo: useAuthIlingo(),
            title: 'Name',
            propName: 'name',
            domProps: {
                disabled: vm.isNameFixed,
            },
        });

        let id = h();
        let changeSecret = h();

        if (vm.entity) {
            id = h('div', {
                staticClass: 'form-group',
            }, [
                h('label', ['ID']),
                h('input', {
                    attrs: {
                        disabled: true,
                        type: 'text',
                        placeholder: '...',
                    },
                    domProps: {
                        disabled: true,
                        value: vm.entity.id,
                    },
                    staticClass: 'form-control',
                }),
            ]);

            changeSecret = h('div', {
                staticClass: 'form-group mb-1',
            }, [
                h('b-form-checkbox', {
                    attrs: {
                        switch: '',
                        size: 'sm',
                    },
                    model: {
                        value: vm.secretChange,
                        callback(v: boolean) {
                            vm.secretChange = v;
                        },
                        expression: 'secretChange',
                    },
                } as VNodeData, [
                    'Change secret?',
                ]),
            ]);
        }

        let secret = h();
        let secretInfo = h();

        if (!vm.isEditing || vm.secretChange) {
            secret = buildFormInput(this, h, {
                ilingo: useAuthIlingo(),
                title: [
                    'Secret',
                    vm.isSecretHashed ? h('span', {
                        staticClass: 'text-danger font-weight-bold',
                    }, [
                        'Hashed',
                        ' ',
                        h('i', { staticClass: 'fa fa-exclamation-triangle pl-1' }),
                    ]) : '',
                ],
                propName: 'secret',
                changeCallback: (input: string) => vm.handleSecretChanged.call(null, input),
            });

            secretInfo = h('div', { staticClass: 'mb-1' }, [
                h('button', {
                    staticClass: 'btn btn-dark btn-xs',
                    on: {
                        click($event: any) {
                            $event.preventDefault();

                            vm.generateSecret.call(null);
                        },
                    },
                }, [
                    h('i', { staticClass: 'fa fa-wrench' }),
                    ' ',
                    'Generate',
                ]),
            ]);
        }

        const submit = buildFormSubmit(this, h, {
            updateText: 'Update',
            createText: 'Create',
        });

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
            id,
            changeSecret,
            secret,
            secretInfo,
            submit,
        ]);
    },
});

export default RobotForm;
