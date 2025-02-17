/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ResourceType } from '@authup/core-kit';
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
    Scope,
} from '@authup/core-kit';
import {
    buildFormGroup,
    buildFormInput,
    buildFormTextarea,
} from '@vuecs/form-controls';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    VuelidateCustomRule,
    VuelidateCustomRuleKey,
    buildFormSubmitWithTranslations,
    createFormSubmitTranslations,
    createResourceManager,
    defineResourceVEmitOptions,
    getVuelidateSeverity,
    initFormAttributesFromSource,
    injectStore,
    storeToRefs,
    useTranslationsForGroup,
    useTranslationsForNestedValidation,
} from '../../core';
import { ARealmPicker } from '../realm';

export const AScopeForm = defineComponent({
    props: {
        name: {
            type: String,
            default: undefined,
        },
        entity: {
            type: Object as PropType<Scope>,
        },
    },
    emits: defineResourceVEmitOptions<Scope>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            display_name: '',
            description: '',
            realm_id: '',
        });

        const $v = useVuelidate({
            name: {
                required,
                [
                VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE
                ]: VuelidateCustomRule[VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE],
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            display_name: {
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

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const manager = createResourceManager({
            type: `${ResourceType.SCOPE}`,
            setup: ctx,
            props,
        });

        const realmId = computed(() => {
            if (!storeRefs.realmIsRoot) {
                return storeRefs.realmId.value;
            }

            return manager.data.value ?
                manager.data.value.realm_id :
                null;
        });

        const isEditing = useIsEditing(manager.data);
        const updatedAt = useUpdatedAt(props.entity);

        const isNameFixed = computed<boolean>(() => {
            if (!!props.name && props.name.length > 0) {
                return true;
            }

            return !!(manager.data.value && manager.data.value.built_in);
        });

        function initForm() {
            if (props.name) {
                form.name = props.name;
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

        const translationsValidation = useTranslationsForNestedValidation($v.value);
        const translationsSubmit = createFormSubmitTranslations();

        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
                { key: TranslatorTranslationDefaultKey.REALM },
            ],
        );

        return () => {
            const children : VNodeArrayChildren = [
                buildFormGroup({
                    validationMessages: translationsValidation.name.value,
                    validationSeverity: getVuelidateSeverity($v.value.name),
                    label: true,
                    labelContent: translationsDefault[TranslatorTranslationDefaultKey.NAME].value,
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
                buildFormGroup({
                    validationMessages: translationsValidation.display_name.value,
                    validationSeverity: getVuelidateSeverity($v.value.display_name),
                    label: true,
                    labelContent: translationsDefault[TranslatorTranslationDefaultKey.DISPLAY_NAME].value,
                    content: buildFormInput({
                        value: $v.value.display_name.$model,
                        onChange(input) {
                            $v.value.display_name.$model = input;
                        },
                    }),
                }),
                buildFormGroup({
                    validationMessages: translationsValidation.description.value,
                    validationSeverity: getVuelidateSeverity($v.value.description),
                    label: true,
                    labelContent: translationsDefault[TranslatorTranslationDefaultKey.DESCRIPTION].value,
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

            if (
                !realmId.value &&
                !isNameFixed.value &&
                !isEditing.value
            ) {
                children.push(buildFormGroup({
                    validationMessages: translationsValidation.realm_id.value,
                    validationSeverity: getVuelidateSeverity($v.value.realm_id),
                    label: true,
                    labelContent: translationsDefault[TranslatorTranslationDefaultKey.REALM].value,
                    content: h(ARealmPicker, {
                        value: $v.value.realm_id.$model,
                        onChange: (input: string[]) => {
                            $v.value.realm_id.$model = input.length > 0 ? input[0] : '';
                        },
                    }),
                }));
            }

            children.push(buildFormSubmitWithTranslations({
                submit,
                busy,
                isEditing: isEditing.value,
                invalid: $v.value.$invalid,
            }, translationsSubmit));

            return h('form', {
                onSubmit($event: any) {
                    $event.preventDefault();

                    return submit.apply(null);
                },
            }, children);
        };
    },
});

export default AScopeForm;
