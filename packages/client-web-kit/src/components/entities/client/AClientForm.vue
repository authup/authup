<!--
  - Copyright (c) 2026.
  -  Author Peter Placzek (tada5hi)
  -  For the full copyright and license information,
  -  view the LICENSE file that was distributed with this source code.
  -->

<script lang="ts">
import {
    type PropType,
    computed,
    defineComponent,
    onMounted,
    reactive,
    useId,
    watch,
} from 'vue';
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
import { type Client, ClientValidator, EntityType } from '@authup/core-kit';
import {
    ValidatorGroup,
    generateName,
    generateSecret,
    isBCryptHash,
} from '@authup/kit';
import { ARealmPicker } from '../realm';
import {
    AFormInputList,
    AFormSubmit,
    ANameInput,
    ASecretInput,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        AFormSubmit,
        ANameInput,
        ASecretInput,
        ARealmPicker,
        AFormInputList,

        IFieldValidation,
    },
    props: {
        name: {
            type: String,
            default: undefined,
        },
        entity: {
            type: Object as PropType<Client>,
            default: undefined,
        },
        realmId: {
            type: String,
            default: undefined,
        },
    },
    emits: defineEntityVEmitOptions<Client>(),
    setup(props, ctx) {
        const nameSeed = useId();
        const form = reactive({
            active: true,
            name: '',
            display_name: '',
            description: '',
            realm_id: '',
            redirect_uri: '',
            base_url: '',
            root_url: '',
            is_confidential: true,
            secret: '',
            secret_hashed: false,
        });

        const manager = defineEntityManager({
            type: `${EntityType.CLIENT}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        // Shared `ClientValidator` from `@authup/core-kit`. Reactive
        // `group` flips between CREATE / UPDATE so the validator's
        // per-mount optional-ness matches the form's mode.
        const v = useValidup(
            new ClientValidator(),
            form,
            { group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)) },
        );

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const updatedAt = useUpdatedAt(props.entity);

        const isNameFixed = computed(() => !!props.name && props.name.length > 0);
        const realmId = computed(() => (manager.data.value ?
            manager.data.value.realm_id :
            storeRefs.realmId.value));

        const isSecretHashed = computed(
            () => {
                if (!manager.data.value || manager.data.value.secret !== form.secret) {
                    return false;
                }

                return isBCryptHash(form.secret);
            },
        );

        function initForm() {
            if (props.name) {
                form.name = props.name;
            }

            assignFormProperties(form, manager.data.value);

            if (form.name.length === 0) {
                form.name = generateName(nameSeed);
            }

            form.realm_id = realmId.value ?? '';
        }

        // Secrets must stay unpredictable, so they can't be seeded from a
        // hydration-stable value the way names are. Generate the initial secret
        // client-side only to keep full entropy without an SSR hydration mismatch.
        onMounted(() => {
            if (form.is_confidential && form.secret.length === 0) {
                form.secret = generateSecret();
            }
        });

        const isConfidential = computed(() => form.is_confidential);
        watch(isConfidential, (val, oldValue) => {
            if (val === oldValue) return;

            if (val) {
                form.secret = manager.data.value?.secret || generateSecret();
            } else {
                form.secret = '';
            }
        });

        watch(
            updatedAt,
            (val, oldVal) => {
                if (val && val !== oldVal) {
                    manager.data.value = props.entity;
                    initForm();
                }
            },
        );

        initForm();

        const submit = async () => {
            if (v.$invalid.value) {
                return;
            }

            await manager.createOrUpdate(form);

            assignFormProperties(form, manager.data.value);
        };

        const translationsClient = useTranslationsForNamespace(
            TranslatorTranslationNamespace.CLIENT,
            [
                { key: TranslatorTranslationClientKey.NAME_HINT },
                { key: TranslatorTranslationClientKey.DESCRIPTION_HINT },
                { key: TranslatorTranslationClientKey.REDIRECT_URI_HINT },
                { key: TranslatorTranslationClientKey.IS_CONFIDENTIAL },
                { key: TranslatorTranslationClientKey.IS_ACTIVE },
                { key: TranslatorTranslationClientKey.HASH_SECRET },
            ],
        );

        const translationsDefault = useTranslations(
            [
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
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.REALM, 
                    count: 1, 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.REDIRECT_URIS, 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.SECRET, 
                },
            ],
        );

        const redirectUris = computed(() => {
            const value = v.fields.redirect_uri.$model.value as string | undefined;
            return value ? value.split(',') : [];
        });

        return {
            translationsDefault,
            translationsClient,
            v,
            data: manager.data,
            isNameFixed,
            isBusy: manager.busy.value,
            isEditing,
            isSecretHashed,
            redirectUris,
            submit,
        };
    },
});
</script>
<template>
    <div class="row">
        <div class="col">
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
                    <template #hint>
                        {{ translationsClient.nameHint }}
                    </template>
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
                        :disabled="isNameFixed"
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
                        {{ translationsDefault.secret }}
                        <template v-if="isSecretHashed">
                            <span class="text-error-600 font-bold">
                                <VCIcon name="fa6-solid:triangle-exclamation" />
                            </span>
                        </template>
                    </template>
                    <ASecretInput
                        :model-value="v.fields.secret.$model.value ?? ''"
                        :disabled="!v.fields.is_confidential.$model.value"
                        @update:model-value="(next: string) => { v.fields.secret.$model.value = next; }"
                    />
                </VCFormGroup>
            </IFieldValidation>
            <div class="row">
                <div class="col">
                    <IFieldValidation
                        v-slot="{ value }"
                        :field="v.fields.is_confidential"
                    >
                        <VCFormGroup :validation="value">
                            <VCFormSwitch
                                v-model="v.fields.is_confidential.$model.value"
                                :label="true"
                                :label-content="translationsClient.isConfidential"
                            />
                        </VCFormGroup>
                    </IFieldValidation>
                </div>
                <div class="col">
                    <IFieldValidation
                        v-slot="{ value }"
                        :field="v.fields.secret_hashed"
                    >
                        <VCFormGroup :validation="value">
                            <VCFormSwitch
                                v-model="v.fields.secret_hashed.$model.value"
                                :label="true"
                                :label-content="translationsClient.hashSecret"
                            />
                        </VCFormGroup>
                    </IFieldValidation>
                </div>
                <div class="col">
                    <IFieldValidation
                        v-slot="{ value }"
                        :field="v.fields.active"
                    >
                        <VCFormGroup :validation="value">
                            <VCFormSwitch
                                v-model="v.fields.active.$model.value"
                                :label="true"
                                :label-content="translationsClient.isActive"
                            />
                        </VCFormGroup>
                    </IFieldValidation>
                </div>
            </div>

            <template v-if="!realmId && !isEditing">
                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.realm_id"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.realm }}
                        </template>
                        <template #default>
                            <ARealmPicker
                                :value="v.fields.realm_id.$model.value"
                                @change="(input: string[]) => {
                                    v.fields.realm_id.$model.value = input.length > 0 ? input[0] ?? '' : '';
                                }"
                            />
                        </template>
                    </VCFormGroup>
                </IFieldValidation>
            </template>
        </div>
        <div class="col">
            <AFormInputList
                :names="redirectUris"
                @changed="(value) => {
                    if (value.length === 0) {
                        v.fields.redirect_uri.$model.value = '';
                        return;
                    }
                    v.fields.redirect_uri.$model.value = value.join(',');
                }"
            >
                <template #label>
                    {{ translationsDefault.redirectUris }}
                </template>
                <template #hint>
                    {{ translationsClient.redirectURIHint }}
                </template>
            </AFormInputList>
            <IFieldValidation
                v-slot="{ value }"
                :field="v.fields.description"
            >
                <VCFormGroup :validation="value">
                    <template #label>
                        {{ translationsDefault.description }}
                    </template>
                    <VCFormTextarea
                        :model-value="v.fields.description.$model.value ?? ''"
                        rows="7"
                        @update:model-value="(next: string) => { v.fields.description.$model.value = next; }"
                    />
                    <template #hint>
                        {{ translationsClient.descriptionHint }}
                    </template>
                </VCFormGroup>
            </IFieldValidation>
            <div>
                <AFormSubmit
                    :is-busy="isBusy"
                    :is-editing="isEditing"
                    :is-invalid="v.$invalid.value"
                    @submit="submit"
                />
            </div>
        </div>
    </div>
</template>
