/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, {
    CreateElement, PropType, VNode,
} from 'vue';
import {
    maxLength, minLength, required,
} from 'vuelidate/lib/validators';
import { Realm, Robot, createNanoID } from '@authelion/common';
import {
    ComponentFormData, ComponentListItemSlotProps, SlotName, buildFormInput, buildFormSubmit, buildListItemToggleAction,
} from '@vue-layout/utils';
import {
    useHTTPClient,
} from '../../../utils';
import { alphaWithUpperNumHyphenUnderScore } from '../../utils/vuelidate';
import { initPropertiesFromSource } from '../../utils/proprety';
import { useAuthIlingo } from '../../language/singleton';
import { buildVuelidateTranslator } from '../../language/utils';
import { RealmList } from '../realm';

type Properties = {
    [key: string]: any;

    name?: string,
    entity?: Robot,
    translatorLocale?: string
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
        translatorLocale: {
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
                        ...(this.isSecretHashed ? { } : { secret }),
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

        const name = buildFormInput(this, h, {
            validationTranslator: buildVuelidateTranslator(vm.translatorLocale),
            title: 'Name',
            propName: 'name',
            domProps: {
                disabled: vm.isNameFixed,
            },
        });

        let id = h();

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
        }

        const secret = buildFormInput(this, h, {
            validationTranslator: buildVuelidateTranslator(vm.translatorLocale),
            title: [
                'Secret',
                vm.isSecretHashed ? h('span', {
                    staticClass: 'text-danger font-weight-bold pl-1',
                }, [
                    'Hashed',
                    ' ',
                    h('i', { staticClass: 'fa fa-exclamation-triangle pl-1' }),
                ]) : '',
            ],
            propName: 'secret',
            changeCallback: (input: string) => vm.handleSecretChanged.call(null, input),
        });

        const secretInfo = h('div', [
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
                useAuthIlingo().getSync('form.generate.button', vm.translatorLocale),
            ]),
        ]);

        const submit = buildFormSubmit(this, h, {
            updateText: useAuthIlingo().getSync('form.update.button', vm.translatorLocale),
            createText: useAuthIlingo().getSync('form.create.button', vm.translatorLocale),
        });

        const leftColumn = h('div', { staticClass: 'col' }, [
            id,
            name,
            secret,
            secretInfo,
            h('hr'),
            submit,
        ]);

        let rightColumn = h();

        if (
            !vm.isRealmLocked
        ) {
            const realm = h(RealmList, {
                scopedSlots: {
                    [SlotName.ITEM_ACTIONS]: (
                        props: ComponentListItemSlotProps<Realm>,
                    ) => buildListItemToggleAction(vm.form, h, {
                        propName: 'realm_id',
                        item: props.item,
                        busy: props.busy,
                    }),
                },
            });

            rightColumn = h('div', {
                staticClass: 'col',
            }, [
                realm,
            ]);
        }

        return h('form', {
            on: {
                submit($event: any) {
                    $event.preventDefault();

                    return vm.submit.apply(null);
                },
            },
        }, [
            h('div', { staticClass: 'row' }, [
                leftColumn,
                rightColumn,
            ]),
        ]);
    },
});

export default RobotForm;
