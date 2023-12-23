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
    VNodeArrayChildren, VNodeChild,
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
    buildFormGroup,
    buildFormInput,
    buildFormSubmit, buildFormTextarea,
} from '@vuecs/form-controls';
import {
    SlotName,
} from '@vuecs/list-controls';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    alphaWithUpperNumHyphenUnderScore,
    createEntityManager, defineEntityManagerEvents,
    initFormAttributesFromSource, renderEntityAssignAction,
    useTranslator, useValidationTranslator,
} from '../../core';
import { RealmList } from '../realm';

export const ScopeForm = defineComponent({
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
    emits: defineEntityManagerEvents<Scope>(),
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

        const manager = createEntityManager({
            type: `${DomainType.SCOPE}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);
        const updatedAt = useUpdatedAt(props.entity);

        const isNameFixed = computed<boolean>(() => {
            if (!!props.name && props.name.length > 0) {
                return true;
            }

            return !!(manager.data.value && manager.data.value.built_in);
        });

        const isRealmLocked = computed(() => !!props.realmId);

        function initForm() {
            if (props.name) {
                form.name = props.name;
            }

            if (props.realmId) {
                form.realm_id = props.realmId;
            }

            initFormAttributesFromSource(form, manager.data.value);
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                manager.data.value = props.entity;
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
            const name: VNodeChild = [
                buildFormGroup({
                    validationResult: $v.value.name,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    label: true,
                    labelContent: 'Name',
                    content: buildFormInput({
                        value: form.name,
                        onChange(input) {
                            form.name = input;
                        },
                        props: {
                            disabled: isNameFixed.value,
                        },
                    }),
                }),
            ];

            const description :VNodeChild = [
                buildFormGroup({
                    validationResult: $v.value.description,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    label: true,
                    labelContent: 'Description',
                    content: buildFormTextarea({
                        value: form.description,
                        onChange(input) {
                            form.description = input;
                        },
                        props: {
                            rows: 7,
                        },
                    }),
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
                        ) => renderEntityAssignAction({
                            item: form.realm_id === props.data.id,
                            busy: props.busy,
                            add() {
                                form.realm_id = props.data.id;
                            },
                            drop() {
                                form.realm_id = '';
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
