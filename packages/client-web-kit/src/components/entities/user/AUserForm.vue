<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { User } from '@authup/core-kit';
import { EntityType, UserValidator, buildUserFakeEmail, isUserFakeEmail } from '@authup/core-kit';
import { ValidatorGroup } from '@authup/kit';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    assignFormProperties,
    useTranslationsForGroup,
} from '../../../core';
import { useValidup } from '@validup/vue';
import { useFieldValidation } from '@ilingo/validup-vue';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    watch,
} from 'vue';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
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

        const manager = defineEntityManager({
            type: `${EntityType.USER}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        const $v = useValidup(new UserValidator(), form as any, {
            group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)),
        });

        const updatedAt = useUpdatedAt(props.entity);

        const isRealmLocked = computed(() => !!props.realmId);
        const showRealmPicker = computed(() => props.canManage && !isRealmLocked.value);

        function initForm() {
            if (
                !!manager.data.value &&
                typeof manager.data.value.name_locked !== 'undefined'
            ) {
                form.name_locked = manager.data.value.name_locked;
            }

            assignFormProperties(form, manager.data.value);

            // Locked-realm prop wins over any realm_id pulled from the
            // loaded entity — apply after assign.
            if (props.realmId) {
                form.realm_id = props.realmId;
            }
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                manager.data.value = props.entity ?? undefined;
                initForm();
            }
        });

        initForm();

        const submit = async () => {
            if (busy.value || $v.$invalid.value) {
                return;
            }

            busy.value = true;
            try {
                await manager.createOrUpdate(form);
            } finally {
                busy.value = false;
            }
        };

        const onNameChange = (input: string) => {
            $v.fields.name.$model.value = input;

            const currentEmail = $v.fields.email.$model.value as string;
            if (!currentEmail || isUserFakeEmail(currentEmail)) {
                $v.fields.email.$model.value = buildUserFakeEmail(input);
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
            $v,
            isEditing,
            showRealmPicker,
            translationsDefault,
            onNameChange,
            submit,
            useFieldValidation,
        };
    },
});

export default AUserForm;
</script>

<template>
    <form @submit.prevent="submit">
        <div :class="showRealmPicker ? 'grid grid-cols-1 md:grid-cols-2 gap-2' : ''">
            <div>
                <VCFormGroup :validation="useFieldValidation($v.fields.name)">
                    <template #label>
                        {{ translationsDefault.name }}
                    </template>
                    <VCFormInput
                        :model-value="$v.fields.name.$model.value"
                        :disabled="form.name_locked"
                        @update:model-value="onNameChange"
                    />
                </VCFormGroup>

                <VCFormGroup :validation="useFieldValidation($v.fields.display_name)">
                    <template #label>
                        {{ translationsDefault.displayName }}
                    </template>
                    <VCFormInput v-model="$v.fields.display_name.$model.value" />
                </VCFormGroup>

                <VCFormGroup :validation="useFieldValidation($v.fields.email)">
                    <template #label>
                        {{ translationsDefault.email }}
                    </template>
                    <VCFormInput
                        v-model="$v.fields.email.$model.value"
                        type="email"
                        placeholder="...@..."
                    />
                </VCFormGroup>

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
                                        :class="[labelClass, form.active ? 'text-success-600' : 'text-error-600']"
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
                                        :class="[labelClass, form.name_locked ? 'text-success-600' : 'text-warning-600']"
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
                    :is-invalid="$v.$invalid"
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
