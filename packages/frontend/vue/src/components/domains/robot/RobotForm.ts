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
    maxLength, minLength,
} from 'vuelidate/lib/validators';
import { Robot } from '@typescript-auth/domains';
import {
    createNanoID, useHTTPClient,
} from '../../../utils';
import { ComponentFormData } from '../../helpers';
import { alphaNumHyphenUnderscore } from '../../utils/vuelidate';
import { buildFormInput } from '../../helpers/form/render/input';
import { buildFormSubmit } from '../../helpers/form/render';

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
    },
    data() {
        return {
            form: {
                name: '',
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
                alphaNumHyphenUnderscore,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            secret: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
        },
    },
    computed: {
        nameFixed() {
            return !!this.name &&
                this.name.length > 0;
        },
        isEditing() {
            return this.entity &&
                Object.prototype.hasOwnProperty.call(this.entity, 'id');
        },
        isSecretEmpty() {
            return !this.form.secret || this.form.secret.length === 0;
        },
        isSecretHashed() {
            return this.item &&
                this.item.secret === this.form.secret &&
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
            .then(this.find)
            .then(this.initFromProperties);
    },
    methods: {
        initFromProperties() {
            if (this.name) {
                this.form.name = this.name;
            }

            if (this.entity) {
                const keys = Object.keys(this.form);
                for (let i = 0; i < keys.length; i++) {
                    if (Object.prototype.hasOwnProperty.call(this.entity, keys[i])) {
                        this.form[keys[i]] = this.entity[keys[i]];
                    }
                }
            }

            if (this.form.secret.length === 0) {
                this.generateSecret();
            }
        },
        generateSecret() {
            this.form.secret = createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_!.', 64);
        },

        async save() {
            if (this.busy || this.$v.$invalid) return;

            this.busy = true;

            try {
                let response;

                if (this.isEditing) {
                    const { secret, ...form } = this.form;

                    response = await useHTTPClient().robot.update(this.item.id, {
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
        async drop() {
            if (this.busy || !this.item) return;

            this.busy = true;

            try {
                const response = await useHTTPClient().robot.delete(this.item.id);

                this.$emit('deleted', response);
            } catch (e) {
                if (e instanceof Error) {
                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
        handleSecretChanged() {
            this.secretHashed = this.item && this.form.secret === this.item.secret;
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        const name = buildFormInput(this, h, {
            title: 'Name',
            propName: 'name',
            inputAttrs: {
                disabled: vm.nameFixed,
            },
        });

        let id = h();
        let changeSecret = h();

        if (vm.entity) {
            id = buildFormInput(this, h, {
                title: 'ID',
                propName: 'id',
                inputAttrs: {
                    disabled: true,
                },
            });

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
                title: h('template', [
                    'Secret',
                    vm.isSecretHashed ? h('span', {
                        staticClass: 'text-danger font-weight-bold',
                    }, [
                        'Hashed',
                        ' ',
                        h('i', { staticClass: 'fa fa-exclamation-triangle' }),
                    ]) : '',
                ]),
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

        const submit = buildFormSubmit(this, h);

        return h('form', {
            on: {
                submit($event: any) {
                    $event.preventDefault();

                    return vm.submit.apply(null);
                },
            },
        }, [
            name,
            id,
            changeSecret,
            secret,
            submit,
        ]);
    },
});

export default RobotForm;
