/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
    maxLength, minLength, required, url,
} from '@vuelidate/validators';
import type {
    Realm, Scope,
} from '@authup/common';
import {
    SlotName,
    buildFormInput,
    buildFormInputCheckbox, buildFormSubmit, buildFormTextarea, buildItemActionToggle,
} from '@vue-layout/hyperscript';
import {
    alphaWithUpperNumHyphenUnderScore,
    createSubmitHandler,
    initFormAttributesFromEntity,
    useHTTPClient,
} from '../../utils';
import { useAuthIlingo } from '../../language/singleton';
import { buildVuelidateTranslator } from '../../language/utils';
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

        const isEditing = computed<boolean>(() => typeof props.entity !== 'undefined' && !!props.entity.id);
        const isNameFixed = computed(() => {
            if (!!props.name && props.name.length > 0) {
                return true;
            }

            return !!(props.entity && props.entity.built_in);
        });
        const isRealmLocked = computed(() => !!props.realmId);
        const updatedAt = computed(() => (props.entity ? props.entity.updated_at : undefined));

        function initForm() {
            if (props.name) {
                form.name = props.name;
            }

            if (props.realmId) {
                form.realm_id = props.realmId;
            }

            initFormAttributesFromEntity(form, props.entity);
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                initForm();
            }
        });

        initForm();

        const render = () => {
            const submit = createSubmitHandler<Scope>({
                props,
                ctx,
                form,
                formIsValid: () => !$v.value.$invalid,
                create: (data) => useHTTPClient().scope.create(data),
                update: (id, data) => useHTTPClient().scope.update(id, data),
            });

            const name = [
                buildFormInput({
                    validationResult: $v.value.name,
                    validationTranslator: buildVuelidateTranslator(props.translatorLocale),
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
                    validationTranslator: buildVuelidateTranslator(props.translatorLocale),
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
                updateText: useAuthIlingo().getSync('form.update.button', props.translatorLocale),
                createText: useAuthIlingo().getSync('form.create.button', props.translatorLocale),
                busy,
                submit,
                isEditing,
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
                        withHeader: false,
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
