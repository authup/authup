/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import useVuelidate from '@vuelidate/core';
import type {
    PropType,
    VNodeArrayChildren,
} from 'vue';
import {
    computed,
    defineComponent,
    h,
    reactive,
    ref,
    watch,
} from 'vue';
import {
    maxLength, minLength, required,
} from '@vuelidate/validators';
import type {
    Realm, Scope,
} from '@authup/core';
import {
    buildFormInput,
    buildFormSubmit, buildFormTextarea,
} from '@vue-layout/form-controls';
import {
    SlotName,
    buildItemActionToggle,
} from '@vue-layout/list-controls';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    alphaWithUpperNumHyphenUnderScore,
    createEntityManager,
    initFormAttributesFromSource,
} from '../../core';
import { useTranslator, useValidationTranslator } from '../../translator';
import { RealmList } from '../realm';

export const ScopeForm = defineComponent({
    name: 'ScopeForm',
    props: {
        name: {
            type: String,
            default: undefined,
        },
        entity: {
            type: Object as PropType<Scope>,
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
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            description: '',
            realm_id: '',
        });

        const $v = useVuelidate({
            name: {
                required,
                alphaWithUpperNumHyphenUnderScore,
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            description: {
                minLength: minLength(3),
                maxLength: maxLength(4096),
            },
            realm_id: {

            },
        }, form);

        const manager = createEntityManager<Scope>({
            type: DomainType.SCOPE,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.entity);
        const updatedAt = useUpdatedAt(props.entity);

        const isNameFixed = computed(() => {
            if (!!props.name && props.name.length > 0) {
                return true;
            }

            return !!(manager.entity.value && manager.entity.value.built_in);
        });
        const isRealmLocked = computed(() => !!props.realmId);

        function initForm() {
            if (props.name) {
                form.name = props.name;
            }

            if (props.realmId) {
                form.realm_id = props.realmId;
            }

            initFormAttributesFromSource(form, manager.entity.value);
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                manager.entity.value = props.entity;
                initForm();
            }
        });

        initForm();

        const submit = async () => {
            if ($v.value.$invalid) {
                return;
            }

            await manager.createOrUpdate(form);
        };

        const render = () => {
            const name = [
                buildFormInput({
                    validationResult: $v.value.name,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    labelContent: 'Name',
                    value: form.name,
                    onChange(input) {
                        form.name = input;
                    },
                    props: {
                        disabled: isNameFixed.value,
                    },
                }),
            ];

            const description = [
                buildFormTextarea({
                    validationResult: $v.value.description,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    labelContent: 'Description',
                    value: form.description,
                    onChange(input) {
                        form.description = input;
                    },
                    props: {
                        rows: 7,
                    },
                }),
            ];

            const submitForm = buildFormSubmit({
                updateText: useTranslator().getSync('form.update.button', props.translatorLocale),
                createText: useTranslator().getSync('form.create.button', props.translatorLocale),
                busy,
                submit,
                isEditing: isEditing.value,
                validationResult: $v.value,
            });

            let realm : VNodeArrayChildren = [];

            if (
                !isRealmLocked.value &&
                !isNameFixed.value
            ) {
                realm = [
                    h('hr'),
                    h('label', { class: 'form-label' }, 'Realm'),
                    h(RealmList, {
                        headerTitle: false,
                    }, {
                        [SlotName.ITEM_ACTIONS]: (
                            props: { data: Realm, busy: boolean },
                        ) => buildItemActionToggle({
                            currentValue: form.realm_id,
                            value: props.data.id,
                            busy: props.busy,
                            onChange(value) {
                                form.realm_id = value as string;
                            },
                        }),
                    }),
                ];
            }

            return h('form', {
                onSubmit($event: any) {
                    $event.preventDefault();

                    return submit.apply(null);
                },
            }, [
                h('div', [
                    name,
                    h('hr'),
                    description,
                    realm,
                    h('hr'),
                    submitForm,
                ]),
            ]);
        };

        return () => render();
    },
});

export default ScopeForm;
