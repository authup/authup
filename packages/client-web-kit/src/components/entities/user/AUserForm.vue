<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { User } from '@authup/core-kit';
import { EntityType, buildUserFakeEmail, isUserFakeEmail } from '@authup/core-kit';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    VuelidateCustomRule,
    VuelidateCustomRuleKey,
    assignFormProperties,
    useTranslationsForGroup,
} from '../../../core';
import useVuelidate from '@vuelidate/core';
import {
    email,
    maxLength,
    minLength,
    required,
} from '@vuelidate/validators';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    watch,
} from 'vue';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
import { IVuelidate } from '@ilingo/vuelidate';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    AToggleButton,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { ARealms } from '../realm';

export const AUserForm = defineComponent({
    components: {
        ARealms,
        AFormSubmit,
        AToggleButton,
        IVuelidate,
        VCFormGroup,
        VCFormInput,
        VCFormSwitch,
    },
    props: {
        entity: {
            type: Object as PropType<User | null>,
            default: undefined,
        },
        realmId: {
            type: String as PropType<string | null>,
            default: undefined,
        },
        canManage: {
            type: Boolean,
            default: true,
        },
    },
    emits: defineEntityVEmitOptions<User>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            active: true,
            name: '',
            name_locked: false,
            display_name: '',
            email: '',
            realm_id: '',
        });

        const $v = useVuelidate({
            active: {},
            name: {
                [VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT]: VuelidateCustomRule[
                    VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT
                ],
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            name_locked: {},
            display_name: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            email: {
                minLength: minLength(5),
                maxLength: maxLength(255),
                email,
                required,
            },
            realm_id: { required },
        }, form);

        const manager = defineEntityManager({
            type: `${EntityType.USER}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);
        const updatedAt = useUpdatedAt(props.entity);

        const isRealmLocked = computed(() => !!props.realmId);
        const showRealmPicker = computed(() => props.canManage && !isRealmLocked.value);

        function initForm() {
            if (props.realmId) {
                form.realm_id = props.realmId;
            }

            if (
                !!manager.data.value &&
                typeof manager.data.value.name_locked !== 'undefined'
            ) {
                form.name_locked = manager.data.value.name_locked;
            }

            assignFormProperties(form, manager.data.value);
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                manager.data.value = props.entity ?? undefined;
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

        const onNameChange = (input: string) => {
            $v.value.name.$model = input;

            if (!$v.value.email.$model || isUserFakeEmail($v.value.email.$model)) {
                $v.value.email.$model = buildUserFakeEmail(input);
            }
        };

        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.ACTIVE },
                { key: TranslatorTranslationDefaultKey.INACTIVE },
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.EMAIL },
                { key: TranslatorTranslationDefaultKey.LOCKED },
                { key: TranslatorTranslationDefaultKey.NOT_LOCKED },
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
            ],
        );

        return {
            busy,
            form,
            vuelidate: $v,
            isEditing,
            showRealmPicker,
            translationsDefault,
            onNameChange,
            submit,
        };
    },
});

export default AUserForm;
</script>

<template>
    <form @submit.prevent="submit">
        <div :class="showRealmPicker ? 'grid grid-cols-1 md:grid-cols-2 gap-2' : ''">
            <div>
                <IVuelidate :validation="vuelidate.name">
                    <template #default="props">
                        <VCFormGroup
                            :validation-messages="props.data"
                            :validation-severity="props.severity"
                        >
                            <template #label>
                                {{ translationsDefault.name }}
                            </template>
                            <VCFormInput
                                :model-value="vuelidate.name.$model"
                                :disabled="form.name_locked"
                                @update:model-value="onNameChange"
                            />
                        </VCFormGroup>
                    </template>
                </IVuelidate>

                <IVuelidate :validation="vuelidate.display_name">
                    <template #default="props">
                        <VCFormGroup
                            :validation-messages="props.data"
                            :validation-severity="props.severity"
                        >
                            <template #label>
                                {{ translationsDefault.displayName }}
                            </template>
                            <VCFormInput v-model="vuelidate.display_name.$model" />
                        </VCFormGroup>
                    </template>
                </IVuelidate>

                <IVuelidate :validation="vuelidate.email">
                    <template #default="props">
                        <VCFormGroup
                            :validation-messages="props.data"
                            :validation-severity="props.severity"
                        >
                            <template #label>
                                {{ translationsDefault.email }}
                            </template>
                            <VCFormInput
                                v-model="vuelidate.email.$model"
                                type="email"
                                placeholder="...@..."
                            />
                        </VCFormGroup>
                    </template>
                </IVuelidate>

                <template v-if="$props.canManage">
                    <div class="row">
                        <div class="col">
                            <VCFormSwitch
                                v-model="form.active"
                                :label="true"
                            >
                                <template #label="{ id, class: labelClass }">
                                    <label
                                        :for="id"
                                        :class="[labelClass, form.active ? 'text-success' : 'text-danger']"
                                    >
                                        {{ form.active ? translationsDefault.active : translationsDefault.inactive }}
                                    </label>
                                </template>
                            </VCFormSwitch>
                        </div>
                        <div
                            v-if="$props.entity"
                            class="col"
                        >
                            <VCFormSwitch
                                v-model="form.name_locked"
                                :label="true"
                            >
                                <template #label="{ id, class: labelClass }">
                                    <label
                                        :for="id"
                                        :class="[labelClass, form.name_locked ? 'text-success' : 'text-warning']"
                                    >
                                        {{ form.name_locked ? translationsDefault.locked : translationsDefault.notLocked }}
                                    </label>
                                </template>
                            </VCFormSwitch>
                        </div>
                    </div>
                </template>

                <AFormSubmit
                    :is-busy="busy"
                    :is-editing="isEditing"
                    :is-invalid="vuelidate.$invalid"
                    @submit="submit"
                />
            </div>

            <div v-if="showRealmPicker">
                <ARealms>
                    <template #itemActions="pickerProps">
                        <AToggleButton
                            :value="form.realm_id === pickerProps.data.id"
                            :is-busy="pickerProps.busy"
                            @changed="(value: boolean) => { form.realm_id = value ? pickerProps.data.id : ''; }"
                        />
                    </template>
                </ARealms>
            </div>
        </div>
    </form>
</template>
