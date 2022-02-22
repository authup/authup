/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    maxLength, minLength, required,
} from 'vuelidate/lib/validators';
import Vue, { CreateElement, PropType, VNode } from 'vue';
import { Realm } from '@typescript-auth/domains';
import { createNanoID, useHTTPClient } from '../../../utils';
import { alphaNumHyphenUnderscore } from '../../utils/vuelidate';
import {
    ComponentFormData,
    buildFormInput,
    buildFormSubmit,
    buildFormTextarea,
} from '../../helpers';

type Properties = {
    entity?: Realm,
};

export const RealmForm = Vue.extend<
ComponentFormData<Realm>,
any,
any,
Properties
>({
    name: 'RealmForm',
    props: {
        entity: {
            type: Object as PropType<Realm>,
            required: false,
            default: undefined,
        },
    },
    data() {
        return {
            form: {
                id: '',
                name: '',
                description: '',
            },

            busy: false,
            message: null,
        };
    },
    validations: {
        form: {
            id: {
                required,
                alphaNumHyphenUnderscore,
                minLength: minLength(5),
                maxLength: maxLength(36),
            },
            name: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(100),
            },
            description: {
                minLength: minLength(5),
                maxLength: maxLength(4096),
            },
        },
    },
    computed: {
        isEditing() {
            return this.entity &&
                Object.prototype.hasOwnProperty.call(this.entity, 'id');
        },
        isIDEmpty() {
            return !this.form.id || this.form.id.length === 0;
        },
    },
    created() {
        this.initFromProperties();
    },
    methods: {
        initFromProperties() {
            if (this.entity) {
                const keys = Object.keys(this.form);
                for (let i = 0; i < keys.length; i++) {
                    if (Object.prototype.hasOwnProperty.call(this.entity, keys[i])) {
                        this.form[keys[i]] = this.entity[keys[i]];
                    }
                }
            }

            if (this.form.id.length === 0) {
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
                    response = await useHTTPClient().realm.update(this.entity.id, this.form);

                    this.$emit('updated', response);
                } else {
                    response = await useHTTPClient().realm.create(this.form);

                    this.$emit('created', response);
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

        generateID() {
            this.form.id = createNanoID();
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        const id = buildFormInput<Realm>(this, h, {
            title: 'ID',
            propName: 'id',
            inputAttrs: {
                disabled: this.isEditing,
            },
        });

        let idHint = h();

        if (!this.isEditing) {
            idHint = h('div', {
                staticClass: 'alert alert-sm',
                class: {
                    'alert-warning': this.isIDEmpty,
                    'alert-success': !this.isIDEmpty,
                },
            }, [
                h('div', {
                    staticClass: 'mb-1',
                }, [
                    h('button', {
                        staticClass: 'btn btn-dark btn-xs',
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
            ]);
        }

        const name = buildFormInput<Realm>(this, h, {
            title: 'Name',
            propName: 'name',
        });

        const description = buildFormTextarea<Realm>(this, h, {
            title: 'Description',
            propName: 'description',
            textareaAttrs: {
                rows: 4,
            },
        });

        const submit = buildFormSubmit(this, h);

        return h('form', {
            on: {
                submit($event: any) {
                    $event.preventDefault();

                    return vm.submit.apply(null);
                },
            },
        }, [
            id,
            idHint,
            h('hr'),
            name,
            h('hr'),
            description,
            h('hr'),
            submit,
        ]);
    },
});
