/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { createNanoID } from '@authup/kit';
import useVuelidate from '@vuelidate/core';
import {
    maxLength, minLength, required,
} from '@vuelidate/validators';
import type { PropType, VNodeArrayChildren } from 'vue';
import {
    computed, defineComponent, h, reactive, ref, watch,
} from 'vue';
import type { Realm } from '@authup/core-kit';
import {
    REALM_MASTER_NAME, ResourceType,
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
    assignFormProperties,
    buildFormSubmitWithTranslations,
    createFormSubmitTranslations,
    getVuelidateSeverity,
    useTranslationsForGroup,
    useTranslationsForNestedValidation,
} from '../../core';
import {
    createResourceManager,
    defineResourceVEmitOptions,
} from '../utility';

export const ARealmForm = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Realm>,
            required: false,
            default: undefined,
        },
    },
    emits: defineResourceVEmitOptions<Realm>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            display_name: '',
            description: '',
        });

        const $v = useVuelidate({
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
                [VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT]: VuelidateCustomRule[
                    VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT
                ],
            },
            display_name: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            description: {
                minLength: minLength(5),
                maxLength: maxLength(4096),
            },
        }, form);

        const manager = createResourceManager({
            type: `${ResourceType.REALM}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);
        const updatedAt = useUpdatedAt(props.entity);
        const isNameEmpty = computed(() => !form.name || form.name.length === 0);

        const generateName = () => {
            form.name = createNanoID();
        };

        function initForm() {
            assignFormProperties(form, manager.data.value);

            if (form.name.length === 0) {
                generateName();
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
                { key: TranslatorTranslationDefaultKey.GENERATE },
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
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
                            manager.data.value.name === REALM_MASTER_NAME,
                    },
                }),
            }));

            if (!manager.data.value || !manager.data.value.id) {
                children.push([
                    h('div', {
                        class: 'mb-3',
                    }, [
                        h('button', {
                            class: ['btn btn-xs', {
                                'btn-dark': isNameEmpty.value,
                                'btn-warning': !isNameEmpty.value,
                            }],
                            onClick($event: any) {
                                $event.preventDefault();

                                generateName.call(null);
                            },
                        }, [
                            h('i', { class: 'fa fa-wrench' }),
                            ' ',
                            translationsDefault[TranslatorTranslationDefaultKey.GENERATE].value,
                        ]),
                    ]),
                ]);
            }

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

            children.push(buildFormSubmitWithTranslations({
                submit,
                busy: busy.value,
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
