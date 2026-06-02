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
    reactive,
    unref,
    watch,
} from 'vue';
import { useValidup } from '@validup/vue';
import { useFieldValidation } from '@ilingo/validup-vue';
import { type Client, ClientValidator, EntityType } from '@authup/core-kit';
import { ValidatorGroup, createNanoID, isBCryptHash } from '@authup/kit';
import { ARealmPicker } from '../realm';
import {
    AFormInputList,
    AFormSubmit,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    assignFormProperties,
    injectStore,
    storeToRefs,
    useTranslationsForGroup,
} from '../../../core';
import { useIsEditing, useUpdatedAt } from '../../../composables';

export default defineComponent({
    components: {
        AFormSubmit,
        ARealmPicker,
        AFormInputList,
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
        const $v = useValidup(
            new ClientValidator(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            form as any,
            { group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)) },
        );

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const updatedAt = useUpdatedAt(props.entity);

        const isNameFixed = computed(() => !!props.name && props.name.length > 0);
        const realmId = computed(() => (manager.data.value ?
            manager.data.value.realm_id :
            storeRefs.realmId.value));

        const generateSecret = () => createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_!.', 32);
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

            // `unref()` for the Pinia 3 / Vue 3.5 double-ref-wrap leak —
            // see authentication-hook/install.ts for the same pattern.
            form.realm_id = (unref(realmId.value) as string | null) ?? '';

            if (form.secret.length === 0) {
                form.secret = generateSecret();
            }
        }

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
            if ($v.$invalid.value) {
                return;
            }

            await manager.createOrUpdate(form);

            assignFormProperties(form, manager.data.value);
        };

        const translationsClient = useTranslationsForGroup(
            TranslatorTranslationGroup.CLIENT,
            [
                { key: TranslatorTranslationClientKey.NAME_HINT },
                { key: TranslatorTranslationClientKey.DESCRIPTION_HINT },
                { key: TranslatorTranslationClientKey.REDIRECT_URI_HINT },
                { key: TranslatorTranslationClientKey.IS_CONFIDENTIAL },
                { key: TranslatorTranslationClientKey.IS_ACTIVE },
                { key: TranslatorTranslationClientKey.HASH_SECRET },
            ],
        );

        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.GENERATE },
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
                { key: TranslatorTranslationDefaultKey.REALM },
                { key: TranslatorTranslationDefaultKey.REDIRECT_URIS },
                { key: TranslatorTranslationDefaultKey.SECRET },
            ],
        );

        const redirectUris = computed(() => {
            const value = $v.fields.redirect_uri!.$model.value as string | undefined;
            return value ? value.split(',') : [];
        });

        return {
            translationsDefault,
            translationsClient,
            $v,
            data: manager.data,
            isNameFixed,
            isBusy: manager.busy.value,
            isEditing,
            isSecretHashed,
            generateSecret,
            redirectUris,
            submit,
            useFieldValidation,
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

            <VCFormGroup :validation="useFieldValidation($v.fields.name!)">
                <template #label>
                    {{ translationsDefault.name }}
                </template>
                <VCFormInput
                    v-model="$v.fields.name!.$model.value"
                    :disabled="isNameFixed"
                />
                <template #hint>
                    {{ translationsClient.nameHint }}
                </template>
            </VCFormGroup>
            <VCFormGroup :validation="useFieldValidation($v.fields.display_name!)">
                <template #label>
                    {{ translationsDefault.displayName }}
                </template>
                <VCFormInput
                    v-model="$v.fields.display_name!.$model.value"
                    :disabled="isNameFixed"
                />
            </VCFormGroup>
            <VCFormGroup :validation="useFieldValidation($v.fields.secret!)">
                <template #label>
                    {{ translationsDefault.secret }}
                    <template v-if="isSecretHashed">
                        <span class="text-error-600 font-bold">
                            <VCIcon name="fa6-solid:triangle-exclamation" />
                        </span>
                    </template>
                </template>
                <VCFormInput
                    v-model="$v.fields.secret!.$model.value"
                    :disabled="!$v.fields.is_confidential!.$model.value"
                >
                    <template #groupAppend>
                        <button
                            class="btn"
                            type="button"
                            @click.prevent="() => $v.fields.secret!.$model.value = generateSecret()"
                        >
                            <VCIcon name="fa6-solid:arrows-rotate" />
                        </button>
                    </template>
                </VCFormInput>
            </VCFormGroup>
            <div class="row">
                <div class="col">
                    <VCFormGroup :validation="useFieldValidation($v.fields.is_confidential!)">
                        <VCFormSwitch
                            v-model="$v.fields.is_confidential!.$model.value"
                            :label="true"
                            :label-content="translationsClient.isConfidential.value"
                        />
                    </VCFormGroup>
                </div>
                <div class="col">
                    <VCFormGroup :validation="useFieldValidation($v.fields.secret_hashed!)">
                        <VCFormSwitch
                            v-model="$v.fields.secret_hashed!.$model.value"
                            :label="true"
                            :label-content="translationsClient.hashSecret.value"
                        />
                    </VCFormGroup>
                </div>
                <div class="col">
                    <VCFormGroup :validation="useFieldValidation($v.fields.active!)">
                        <VCFormSwitch
                            v-model="$v.fields.active!.$model.value"
                            :label="true"
                            :label-content="translationsClient.isActive.value"
                        />
                    </VCFormGroup>
                </div>
            </div>

            <template v-if="!realmId && !isEditing">
                <VCFormGroup :validation="useFieldValidation($v.fields.realm_id!)">
                    <template #label>
                        {{ translationsDefault.realm }}
                    </template>
                    <template #default>
                        <ARealmPicker
                            :value="$v.fields.realm_id!.$model.value"
                            @change="(input: string[]) => {
                                $v.fields.realm_id!.$model.value = input.length > 0 ? input[0] ?? '' : '';
                            }"
                        />
                    </template>
                </VCFormGroup>
            </template>
        </div>
        <div class="col">
            <AFormInputList
                :names="redirectUris"
                @changed="(value) => {
                    if (value.length === 0) {
                        $v.fields.redirect_uri!.$model.value = '';
                        return;
                    }
                    $v.fields.redirect_uri!.$model.value = value.join(',');
                }"
            >
                <template #label>
                    {{ translationsDefault.redirectUris }}
                </template>
                <template #hint>
                    {{ translationsClient.redirectURIHint }}
                </template>
            </AFormInputList>
            <VCFormGroup :validation="useFieldValidation($v.fields.description!)">
                <template #label>
                    {{ translationsDefault.description }}
                </template>
                <VCFormTextarea
                    v-model="$v.fields.description!.$model.value"
                    rows="7"
                />
                <template #hint>
                    {{ translationsClient.descriptionHint }}
                </template>
            </VCFormGroup>
            <div>
                <AFormSubmit
                    :is-busy="isBusy"
                    :is-editing="isEditing"
                    :is-invalid="$v.$invalid.value"
                    @submit="submit"
                />
            </div>
        </div>
    </div>
</template>
