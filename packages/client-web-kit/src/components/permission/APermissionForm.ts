/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '@authup/core-kit';
import { DomainType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import type { PropType, VNodeArrayChildren } from 'vue';
import {
    computed,
    defineComponent, h, reactive, ref, watch,
} from 'vue';
import {
    maxLength, minLength, required,
} from '@vuelidate/validators';
import {
    buildFormGroup, buildFormInput, buildFormTextarea,
} from '@vuecs/form-controls';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    buildFormSubmitWithTranslations,
    createEntityManager,
    createFormSubmitTranslations,
    defineEntityManagerEvents,
    getVuelidateSeverity,
    initFormAttributesFromSource,
    injectStore,
    storeToRefs, useTranslationsForGroup, useTranslationsForNestedValidation,
} from '../../core';
import { createRealmFormPicker } from '../realm/helpers';

export const APermissionForm = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Permission>,
        },
    },
    emits: defineEntityManagerEvents<Permission>(),
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
                minLength: minLength(3),
                maxLength: maxLength(128),
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
        }, form);

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const manager = createEntityManager({
            type: `${DomainType.PERMISSION}`,
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
                children.push(createRealmFormPicker(form));
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

        return () => render();
    },
});
