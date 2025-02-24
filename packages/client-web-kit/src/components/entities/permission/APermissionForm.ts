/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import type { PropType, Ref, VNodeArrayChildren } from 'vue';
import {
    computed,
    defineComponent, h, nextTick, reactive, ref, watch,
} from 'vue';
import {
    maxLength, minLength, required,
} from '@vuelidate/validators';
import {
    buildFormGroup, buildFormInput, buildFormTextarea,
} from '@vuecs/form-controls';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    VuelidateCustomRule,
    VuelidateCustomRuleKey,
    assignFormProperties,
    buildFormSubmitWithTranslations,
    createFormSubmitTranslations,
    getVuelidateSeverity,
    injectStore,
    storeToRefs,
    useTranslationsForGroup,
    useTranslationsForNestedValidation,
} from '../../../core';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { APolicyPicker } from '../policy/APolicyPicker';
import { ARealmPicker } from '../realm';

export const APermissionForm = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Permission>,
        },
    },
    emits: defineEntityVEmitOptions<Permission>(),
    setup(props, ctx) {
        const policyPickerVNode = ref(null) as Ref<null | typeof ARealmPicker>;
        const busy = ref(false);

        const form = reactive({
            name: '',
            display_name: '',
            description: '',
            realm_id: '',
            policy_id: '',
        });

        const $v = useVuelidate({
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
                [
                VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT
                ]: VuelidateCustomRule[VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT],
            },
            display_name: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            description: {
                minLength: minLength(5),
                maxLength: maxLength(4096),
            },
            realm_id: {

            },
            policy_id: {

            },
        }, form);

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const manager = defineEntityManager({
            type: `${EntityType.PERMISSION}`,
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

        function initForm() {
            assignFormProperties(form, manager.data.value);

            if (realmId.value) {
                form.realm_id = realmId.value;
            }
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
                { key: TranslatorTranslationDefaultKey.POLICY },
                { key: TranslatorTranslationDefaultKey.REALM },
            ],
        );

        const render = () => {
            const children : VNodeArrayChildren = [];

            children.push(buildFormGroup({
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
                        disabled: manager.data.value &&
                            manager.data.value.built_in,
                    },
                }),
            }));

            children.push(buildFormGroup({
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
            }));

            children.push(buildFormGroup({
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
                        rows: 4,
                    },
                }),
            }));

            if (!realmId.value && !isEditing.value) {
                children.push(buildFormGroup({
                    validationMessages: translationsValidation.realm_id.value,
                    validationSeverity: getVuelidateSeverity($v.value.realm_id),
                    label: true,
                    labelContent: translationsDefault[TranslatorTranslationDefaultKey.REALM].value,
                    content: h(ARealmPicker, {
                        value: $v.value.realm_id.$model,
                        multiple: false,
                        onChange(input: string[]) {
                            $v.value.realm_id.$model = input.length > 0 ? input[0] : '';
                            $v.value.policy_id.$model = '';

                            nextTick(() => {
                                if (policyPickerVNode.value) {
                                    policyPickerVNode.value.load();
                                }
                            });
                        },
                    }),
                }));
            }

            children.push(buildFormGroup({
                validationMessages: translationsValidation.policy_id.value,
                validationSeverity: getVuelidateSeverity($v.value.policy_id),
                label: true,
                labelContent: translationsDefault[TranslatorTranslationDefaultKey.POLICY].value,
                content: h(APolicyPicker, {
                    ref: policyPickerVNode,
                    value: $v.value.policy_id.$model,
                    onChange: (input: string[]) => {
                        $v.value.policy_id.$model = input.length > 0 ? input[0] : '';
                    },
                    query: {
                        filters: {
                            parent_id: null,
                            ...(form.realm_id ? { realm_id: form.realm_id } : {}),
                        },
                    },
                }),
            }));

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

        return () => render();
    },
});
