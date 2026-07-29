<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { EntityType, KeyStatus, KeyValidator } from '@authup/core-kit';
import { JWKUse, JWTAlgorithm } from '@authup/specs';
import { ValidatorGroup, generateName } from '@authup/kit';
import { useValidup } from '@validup/vue';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    assignFormProperties,
    injectStore,
    storeToRefs,
    useTranslations,
    useTranslationsForNamespace,
} from '../../../core';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
    useId,
    watch,
} from 'vue';
import type { Key } from '@authup/core-kit';
import type { FormOption } from '@vuecs/forms';
import {
    VCFormCheckbox,
    VCFormGroup,
    VCFormInput,
    VCFormSelect,
    VCFormTextarea,
} from '@vuecs/forms';
import { VCIcon } from '@vuecs/icon';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import {
    AFormSubmit,
    ANameInput,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { ARealmPicker } from '../realm';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        ANameInput,
        ARealmPicker,
        AFormSubmit,
        VCFormCheckbox,
        VCFormGroup,
        VCFormInput,
        VCFormSelect,
        VCFormTextarea,
        VCIcon,

        IFieldValidation,
    },
    props: {
        entity: { type: Object as PropType<Key> },
        realmId: {
            type: String,
            default: undefined,
        },
    },
    emits: defineEntityVEmitOptions<Key>(),
    setup(props, ctx) {
        const busy = ref(false);
        const nameSeed = useId();
        const form = reactive({
            name: '',
            use: `${JWKUse.SIGNATURE}`,
            signatureAlgorithm: `${JWTAlgorithm.RS256}`,
            priority: 0,
            status: `${KeyStatus.ACTIVE}`,
            realmId: '',
            decryptionKey: '',
            encryptionKey: '',
            certificate: '',
        });

        const translationsClient = useTranslationsForNamespace(
            TranslatorTranslationNamespace.CLIENT,
            [
                { key: TranslatorTranslationClientKey.KEY_USE_SIGNATURE },
                { key: TranslatorTranslationClientKey.KEY_USE_ENCRYPTION },
                { key: TranslatorTranslationClientKey.KEY_IMPORT_MATERIAL },
                { key: TranslatorTranslationClientKey.KEY_MATERIAL_OCT },
                { key: TranslatorTranslationClientKey.KEY_MATERIAL_PRIVATE },
                { key: TranslatorTranslationClientKey.KEY_MATERIAL_PUBLIC },
            ],
        );

        const useOptions = computed<FormOption[]>(() => [
            { value: `${JWKUse.SIGNATURE}`, label: translationsClient.keyUseSignature },
            { value: `${JWKUse.ENCRYPTION}`, label: translationsClient.keyUseEncryption },
        ]);

        const algorithmOptions : FormOption[] = [
            JWTAlgorithm.RS256,
            JWTAlgorithm.RS384,
            JWTAlgorithm.RS512,
            JWTAlgorithm.ES256,
            JWTAlgorithm.ES384,
            JWTAlgorithm.ES512,
        ].map((value) => ({ value: `${value}`, label: `${value}` }));

        const statusOptions : FormOption[] = Object.values(KeyStatus)
            .map((value) => ({ value: `${value}`, label: `${value}` }));

        const manager = defineEntityManager({
            type: `${EntityType.KEY}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        const v = useValidup(
            new KeyValidator(),
            form as Partial<Key>,
            { group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)) },
        );

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const realmLock = computed(() => {
            if (props.realmId) {
                return props.realmId;
            }

            if (!storeRefs.realmIsRoot.value) {
                return storeRefs.realmId.value;
            }

            return manager.data.value ?
                manager.data.value.realmId :
                null;
        });

        const updatedAt = useUpdatedAt(() => props.entity);

        const isEnc = computed(() => form.use === `${JWKUse.ENCRYPTION}`);

        const importEnabled = ref(false);

        function initForm() {
            assignFormProperties(form, manager.data.value, { fields: v.fields });

            if (props.realmId) {
                form.realmId = props.realmId;
            }

            if (form.name.length === 0) {
                form.name = generateName(nameSeed);
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

            if (!isEditing.value) {
                if (!importEnabled.value) {
                    form.decryptionKey = '';
                    form.encryptionKey = '';
                    form.certificate = '';
                }

                if (isEnc.value) {
                    form.signatureAlgorithm = '';
                    form.encryptionKey = '';
                    form.certificate = '';
                }
            }

            busy.value = true;
            try {
                // string-enum form sentinels ('' = unset) widen the fields beyond
                // the entity's literal unions — narrow for the manager call.
                await manager.createOrUpdate(form as Partial<Key>);
            } finally {
                busy.value = false;
            }
        };

        const updateCertificate = (value: string) => {
            if (v.fields.certificate) {
                v.fields.certificate.$model.value = value;
            }
        };

        const translationsDefault = useTranslations(
            [
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.NAME,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.USE,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.STATUS,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.PRIORITY,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.SIGNATURE_ALGORITHM,
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD,
                    key: TranslatorTranslationFieldKey.CERTIFICATE,
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY,
                    key: TranslatorTranslationEntityKey.REALM,
                    count: 1,
                },
            ],
        );

        return {
            busy,
            v,
            isEditing,
            isEnc,
            importEnabled,
            realmLock,
            useOptions,
            algorithmOptions,
            statusOptions,
            translationsDefault,
            translationsClient,
            submit,
            updateCertificate,
        };
    },
});
</script>

<template>
    <form @submit.prevent="submit">
        <template v-if="!isEditing">
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.use"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.use }}
                    </template>
                    <VCFormSelect
                        v-model="v.fields.use.$model.value"
                        :options="useOptions"
                    />
                </VCFormGroup>
            </IFieldValidation>
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
                />
            </VCFormGroup>
        </IFieldValidation>

        <template v-if="!isEditing && !isEnc">
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.signatureAlgorithm"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.signatureAlgorithm }}
                    </template>
                    <VCFormSelect
                        v-model="v.fields.signatureAlgorithm.$model.value"
                        :options="algorithmOptions"
                    />
                </VCFormGroup>
            </IFieldValidation>
        </template>

        <template v-if="isEditing">
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.status"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.status }}
                    </template>
                    <VCFormSelect
                        v-model="v.fields.status.$model.value"
                        :options="statusOptions"
                    />
                </VCFormGroup>
            </IFieldValidation>

            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.priority"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.priority }}
                    </template>
                    <VCFormInput
                        type="number"
                        :model-value="`${v.fields.priority.$model.value ?? 0}`"
                        @update:model-value="(next: string) => { v.fields.priority.$model.value = Number.parseInt(next, 10) || 0; }"
                    />
                </VCFormGroup>
            </IFieldValidation>
        </template>

        <template v-if="!isEditing">
            <VCFormGroup>
                <VCFormCheckbox
                    v-model="importEnabled"
                    label
                    :label-content="translationsClient.keyImportMaterial"
                >
                    <!--
                        theme-tailwind's `formCheckbox.indicator` carries no
                        glyph and the tailwind stack does not load
                        `@vuecs/forms`' base stylesheet, so a checked box is a
                        solid square. Drop this once upstream ships a glyph
                        (tada5hi/vuecs#1694).
                    -->
                    <template #indicator>
                        <VCIcon
                            name="fa6-solid:check"
                            class="text-[0.625rem]"
                        />
                    </template>
                </VCFormCheckbox>
            </VCFormGroup>

            <template v-if="importEnabled">
                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.decryptionKey"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ isEnc ? translationsClient.keyMaterialOct : translationsClient.keyMaterialPrivate }}
                        </template>
                        <VCFormTextarea
                            :model-value="v.fields.decryptionKey.$model.value ?? ''"
                            :rows="5"
                            @update:model-value="(next: string) => { v.fields.decryptionKey.$model.value = next; }"
                        />
                    </VCFormGroup>
                </IFieldValidation>

                <template v-if="!isEnc">
                    <IFieldValidation
                        v-slot="{ value }"
                        :field="v.fields.encryptionKey"
                    >
                        <VCFormGroup :validation="value">
                            <template #label>
                                {{ translationsClient.keyMaterialPublic }}
                            </template>
                            <VCFormTextarea
                                :model-value="v.fields.encryptionKey.$model.value ?? ''"
                                :rows="5"
                                @update:model-value="(next: string) => { v.fields.encryptionKey.$model.value = next; }"
                            />
                        </VCFormGroup>
                    </IFieldValidation>

                    <IFieldValidation
                        v-if="v.fields.certificate"
                        v-slot="{ value }"
                        :field="v.fields.certificate"
                    >
                        <VCFormGroup :validation="value">
                            <template #label>
                                {{ translationsDefault.certificate }}
                            </template>
                            <VCFormTextarea
                                :model-value="v.fields.certificate.$model.value ?? ''"
                                :rows="8"
                                @update:model-value="updateCertificate"
                            />
                        </VCFormGroup>
                    </IFieldValidation>
                </template>
            </template>

            <template v-if="!realmLock">
                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.realmId"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.realm }}
                        </template>
                        <ARealmPicker
                            :value="v.fields.realmId.$model.value"
                            @change="(input: string[]) => {
                                v.fields.realmId.$model.value = input.length > 0 ? input[0] ?? '' : '';
                            }"
                        />
                    </VCFormGroup>
                </IFieldValidation>
            </template>
        </template>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="v.$invalid.value"
            @submit="submit"
        />
    </form>
</template>
