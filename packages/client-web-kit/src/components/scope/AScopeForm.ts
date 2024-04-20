/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
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
} from '@authup/core-kit';
import {
    buildFormGroup,
    buildFormInput,
    buildFormTextarea,
} from '@vuecs/form-controls';
import {
    SlotName,
} from '@vuecs/list-controls';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    alphaWithUpperNumHyphenUnderScore, buildFormSubmitWithTranslations,
    createEntityManager, createFormSubmitTranslations,
    defineEntityManagerEvents,
    initFormAttributesFromSource,
    renderEntityAssignAction,
    useTranslationsForNestedValidation,
} from '../../core';
import { ARealms } from '../realm';

export const AScopeForm = defineComponent({
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

        const validationMessages = useTranslationsForNestedValidation($v.value);
        const submitTranslations = createFormSubmitTranslations();

        const render = () => {
            const name: VNodeChild = [
                buildFormGroup({
                    validationMessages: validationMessages.name.value,
                    dirty: $v.value.name.$dirty,
                    label: true,
                    labelContent: 'Name',
                    content: buildFormInput({
                        value: $v.value.name.$model,
                        onChange(input) {
                            $v.value.name.$model = input;
                        },
                        props: {
                            disabled: isNameFixed.value,
                        },
                    }),
                }),
            ];

            const description :VNodeChild = [
                buildFormGroup({
                    validationMessages: validationMessages.description.value,
                    dirty: $v.value.description.$dirty,
                    label: true,
                    labelContent: 'Description',
                    content: buildFormTextarea({
                        value: $v.value.description.$model,
                        onChange(input) {
                            $v.value.description.$model = input;
                        },
                        props: {
                            rows: 7,
                        },
                    }),
                }),
            ];

            const submitForm = buildFormSubmitWithTranslations({
                busy,
                submit,
                isEditing: isEditing.value,
                invalid: $v.value.$invalid,
            }, submitTranslations);

            let realm : VNodeArrayChildren = [];

            if (
                !isRealmLocked.value &&
                !isNameFixed.value
            ) {
                realm = [
                    h('hr'),
                    h('label', { class: 'form-label' }, 'Realm'),
                    h(ARealms, {
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

export default AScopeForm;
