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
import { TranslatorTranslationEntityKey, TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import {
    assignFormProperties,
    injectStore,
    storeToRefs,
    useTranslations,
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
            signature_algorithm: `${JWTAlgorithm.RS256}`,
            priority: 0,
            status: `${KeyStatus.ACTIVE}`,
            realm_id: '',
            decryption_key: '',
            encryption_key: '',
        });

        const useOptions : FormOption[] = [
            { value: `${JWKUse.SIGNATURE}`, label: 'Signature (sig)' },
            { value: `${JWKUse.ENCRYPTION}`, label: 'Encryption (enc)' },
        ];

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
                manager.data.value.realm_id :
                null;
        });

        const updatedAt = useUpdatedAt(() => props.entity);

        const isEnc = computed(() => form.use === `${JWKUse.ENCRYPTION}`);

        const importEnabled = ref(false);

        function initForm() {
            assignFormProperties(form, manager.data.value, { fields: v.fields });

            if (props.realmId) {
                form.realm_id = props.realmId;
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
            if (v.$invalid.value) {
                return;
            }

            if (!isEditing.value) {
                if (!importEnabled.value) {
                    form.decryption_key = '';
                    form.encryption_key = '';
                }

                if (isEnc.value) {
                    form.signature_algorithm = '';
                    form.encryption_key = '';
                }
            }

            // string-enum form sentinels ('' = unset) widen the fields beyond
            // the entity's literal unions — narrow for the manager call.
            await manager.createOrUpdate(form as Partial<Key>);
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
            submit,
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
                :field="v.fields.signature_algorithm"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.signatureAlgorithm }}
                    </template>
                    <VCFormSelect
                        v-model="v.fields.signature_algorithm.$model.value"
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
                    label-content="Import existing key material"
                />
            </VCFormGroup>

            <template v-if="importEnabled">
                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.decryption_key"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ isEnc ? 'Key material (32 bytes, base64)' : 'Private key (PKCS#8, base64 or PEM)' }}
                        </template>
                        <VCFormTextarea
                            :model-value="v.fields.decryption_key.$model.value ?? ''"
                            :rows="5"
                            @update:model-value="(next: string) => { v.fields.decryption_key.$model.value = next; }"
                        />
                    </VCFormGroup>
                </IFieldValidation>

                <template v-if="!isEnc">
                    <IFieldValidation
                        v-slot="{ value }"
                        :field="v.fields.encryption_key"
                    >
                        <VCFormGroup :validation="value">
                            <template #label>
                                Public key (SPKI, base64 or PEM)
                            </template>
                            <VCFormTextarea
                                :model-value="v.fields.encryption_key.$model.value ?? ''"
                                :rows="5"
                                @update:model-value="(next: string) => { v.fields.encryption_key.$model.value = next; }"
                            />
                        </VCFormGroup>
                    </IFieldValidation>
                </template>
            </template>

            <template v-if="!realmLock">
                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.realm_id"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.realm }}
                        </template>
                        <ARealmPicker
                            :value="v.fields.realm_id.$model.value"
                            @change="(input: string[]) => {
                                v.fields.realm_id.$model.value = input.length > 0 ? input[0] ?? '' : '';
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
