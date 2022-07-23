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
import { Realm, createNanoID } from '@authelion/common';
import {
    ComponentFormData,
    buildFormInput,
    buildFormSubmit,
    buildFormTextarea,
} from '@vue-layout/utils';
import { useHTTPClient } from '../../../utils';
import { alphaNumHyphenUnderscore } from '../../utils/vuelidate';
import { initPropertiesFromSource } from '../../utils/proprety';
import { useAuthIlingo } from '../../language/singleton';
import { buildVuelidateTranslator } from '../../language/utils';

type Properties = {
    entity?: Realm,
    translatorLocale?: string
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
        translatorLocale: {
            type: String,
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
            if (this.entity) {
                initPropertiesFromSource<Realm>(this.entity, this.form);
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
            validationTranslator: buildVuelidateTranslator(vm.translatorLocale),
            title: 'ID',
            propName: 'id',
            domProps: {
                disabled: vm.isEditing,
            },
            attrs: {
                disabled: vm.isEditing,
            },
        });

        let idHint = h();

        if (!this.isEditing) {
            idHint = h('div', {
                staticClass: 'mb-3',
            }, [
                h('button', {
                    staticClass: 'btn btn-xs',
                    class: {
                        'btn-dark': this.isIDEmpty,
                        'btn-warning': !this.isIDEmpty,
                    },
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
            ]);
        }

        const name = buildFormInput<Realm>(this, h, {
            validationTranslator: buildVuelidateTranslator(vm.translatorLocale),
            title: 'Name',
            propName: 'name',
        });

        const description = buildFormTextarea<Realm>(this, h, {
            validationTranslator: buildVuelidateTranslator(vm.translatorLocale),
            title: 'Description',
            propName: 'description',
            attrs: {
                rows: 4,
            },
        });

        const submit = buildFormSubmit(this, h, {
            updateText: useAuthIlingo().getSync('form.update.button', vm.translatorLocale),
            createText: useAuthIlingo().getSync('form.create.button', vm.translatorLocale),
        });

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
