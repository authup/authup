<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { ValidatorGroup, generateName, generateSecret } from '@authup/kit';
import { useValidup } from '@validup/vue';
import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { assignFormProperties, useTranslations } from '../../../core';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    onMounted,
    reactive,
    ref,
    useId,
    watch,
} from 'vue';
import type { Robot } from '@authup/core-kit';
import { EntityType, RobotValidator } from '@authup/core-kit';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { VCIcon } from '@vuecs/icon';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    ANameInput,
    ASecretInput,
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
        ASecretInput,
        AToggleButton,
        VCFormGroup,
        VCFormInput,
        VCIcon,

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
        const nameSeed = useId();
        const form = reactive({
            name: '',
            displayName: '',
            realmId: '',
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

        const updatedAt = useUpdatedAt(() => props.entity);

        const isNameFixed = computed(() => !!props.name && props.name.length > 0);
        const isRealmLocked = computed(() => !!props.realmId);
        const isSecretHashed = computed(
            () => manager.data.value &&
                manager.data.value.secret === form.secret &&
                form.secret.startsWith('$'),
        );

        function initForm() {
            assignFormProperties(form, manager.data.value, { fields: v.fields });

            // Apply caller-fixed props AFTER assign so the entity payload
            // can't overwrite a locked name / realm.
            if (props.name) form.name = props.name;
            if (props.realmId) form.realmId = props.realmId;

            if (form.name.length === 0) {
                form.name = generateName(nameSeed);
            }
        }

        // Secrets must stay unpredictable, so they can't be seeded from a
        // hydration-stable value the way names are. Generate the initial secret
        // client-side only to keep full entropy without an SSR hydration mismatch.
        onMounted(() => {
            if (form.secret.length === 0) {
                form.secret = generateSecret();
            }
        });

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
            submit,
        };
    },
});

</script>

<template>
    <form @submit.prevent="submit">
        <div :class="!isRealmLocked ? 'flex flex-wrap -mx-2' : ''">
            <div :class="!isRealmLocked ? 'flex-1 basis-0 px-2' : ''">
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
                    :field="v.fields.displayName"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.displayName }}
                        </template>
                        <VCFormInput
                            :model-value="v.fields.displayName.$model.value ?? ''"
                            @update:model-value="(next: string) => { v.fields.displayName.$model.value = next; }"
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
                        <ASecretInput
                            :model-value="v.fields.secret.$model.value ?? ''"
                            @update:model-value="(next: string) => { v.fields.secret.$model.value = next; }"
                        />
                    </VCFormGroup>
                </IFieldValidation>

                <AFormSubmit
                    :is-busy="busy"
                    :is-editing="isEditing"
                    :is-invalid="v.$invalid.value"
                    @submit="submit"
                />
            </div>

            <div
                v-if="!isRealmLocked"
                class="flex-1 basis-0 px-2"
            >
                <ARealms>
                    <template #itemActions="pickerProps">
                        <AToggleButton
                            :value="form.realmId === pickerProps.data.id"
                            :is-busy="pickerProps.busy"
                            @changed="(value: boolean) => { v.fields.realmId.$model.value = value ? pickerProps.data.id : ''; }"
                        />
                    </template>
                </ARealms>
            </div>
        </div>
    </form>
</template>
