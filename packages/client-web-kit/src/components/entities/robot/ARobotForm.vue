<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { ValidatorGroup, createNanoID, generateName } from '@authup/kit';
import { useValidup } from '@validup/vue';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
    assignFormProperties,
    useTranslations,
} from '../../../core';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    watch,
} from 'vue';
import type { Robot } from '@authup/core-kit';
import { EntityType, RobotValidator } from '@authup/core-kit';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    ANameInput,
    AToggleButton,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { ARealms } from '../realm';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        ARealms,
        AFormSubmit,
        ANameInput,
        AToggleButton,
        VCFormGroup,
        VCFormInput,

        IFieldValidation,
    },
    props: {
        name: { type: String, default: undefined },
        entity: { type: Object as PropType<Robot>, default: undefined },
        realmId: { type: String, default: undefined },
    },
    emits: defineEntityVEmitOptions<Robot>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            display_name: '',
            realm_id: '',
            secret: '',
        });

        const manager = defineEntityManager({
            type: `${EntityType.ROBOT}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        const v = useValidup(
            new RobotValidator(),
            form,
            { group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)) },
        );

        const updatedAt = useUpdatedAt(props.entity);

        const isNameFixed = computed(() => !!props.name && props.name.length > 0);
        const isRealmLocked = computed(() => !!props.realmId);
        const isSecretHashed = computed(
            () => manager.data.value &&
                manager.data.value.secret === form.secret &&
                form.secret.startsWith('$'),
        );

        const generateSecret = () => {
            form.secret = createNanoID(64);
        };

        function initForm() {
            assignFormProperties(form, manager.data.value);

            // Apply caller-fixed props AFTER assign so the entity payload
            // can't overwrite a locked name / realm.
            if (props.name) form.name = props.name;
            if (props.realmId) form.realm_id = props.realmId;

            if (form.name.length === 0) {
                form.name = generateName();
            }

            if (form.secret.length === 0) {
                generateSecret();
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
            if (busy.value || v.$invalid.value) {
                return;
            }

            busy.value = true;
            try {
                await manager.createOrUpdate({
                    ...form,
                    secret: isSecretHashed.value ? '' : form.secret,
                });
            } finally {
                busy.value = false;
            }
        };

        const translationsDefault = useTranslations(
            [
                {
                    namespace: TranslatorTranslationNamespace.ACTION, 
                    key: TranslatorTranslationActionKey.GENERATE, 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.HASHED, 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.NAME, 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.DISPLAY_NAME, 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.DESCRIPTION, 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.SECRET, 
                },
            ],
        );

        return {
            busy,
            form,
            v,
            isEditing,
            isNameFixed,
            isRealmLocked,
            isSecretHashed,
            data: manager.data,
            translationsDefault,
            generateSecret,
            submit,
        };
    },
});

</script>

<template>
    <form @submit.prevent="submit">
        <div :class="!isRealmLocked ? 'row' : ''">
            <div :class="!isRealmLocked ? 'col' : ''">
                <template v-if="data">
                    <VCFormGroup>
                        <template #label>
                            ID
                        </template>
                        <VCFormInput
                            :model-value="data.id"
                            :disabled="true"
                        />
                    </VCFormGroup>
                </template>

                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.name"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.name }}
                        </template>
                        <ANameInput
                            v-model="v.fields.name.$model.value"
                            :disabled="isNameFixed"
                        />
                    </VCFormGroup>
                </IFieldValidation>

                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.display_name"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.displayName }}
                        </template>
                        <VCFormInput
                            :model-value="v.fields.display_name.$model.value ?? ''"
                            @update:model-value="(next: string) => { v.fields.display_name.$model.value = next; }"
                        />
                    </VCFormGroup>
                </IFieldValidation>

                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.secret"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.secret }}<span
                                v-if="isSecretHashed"
                                class="text-error-600 font-bold ps-1"
                            >
                                {{ translationsDefault.hashed }}
                                <VCIcon
                                    name="fa6-solid:triangle-exclamation"
                                    class="ps-1"
                                />
                            </span>
                        </template>
                        <VCFormInput
                            :model-value="v.fields.secret.$model.value ?? ''"
                            @update:model-value="(next: string) => { v.fields.secret.$model.value = next; }"
                        />
                    </VCFormGroup>
                </IFieldValidation>

                <div>
                    <button
                        type="button"
                        class="btn btn-dark btn-xs"
                        @click.prevent="generateSecret"
                    >
                        <VCIcon name="fa6-solid:wrench" /> {{ translationsDefault.generate }}
                    </button>
                </div>

                <AFormSubmit
                    :is-busy="busy"
                    :is-editing="isEditing"
                    :is-invalid="v.$invalid.value"
                    @submit="submit"
                />
            </div>

            <div
                v-if="!isRealmLocked"
                class="col"
            >
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
