<!--
  - Copyright (c) 2026.
  -  Author Peter Placzek (tada5hi)
  -  For the full copyright and license information,
  -  view the LICENSE file that was distributed with this source code.
  -->

<script lang="ts">
import {
    type PropType, computed, defineComponent, reactive, watch,
} from 'vue';
import useVuelidate from '@vuelidate/core';
import {
    maxLength, minLength, required,
} from '@vuelidate/validators';
import { type Client, EntityType } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import { IVuelidate } from '@ilingo/vuelidate';
import { ARealmPicker } from '../realm';
import {
    AFormInputList, AFormSubmit, defineEntityManager, defineEntityVEmitOptions,
} from '../../utility';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationDefaultKey, TranslatorTranslationGroup, VuelidateCustomRule, VuelidateCustomRuleKey,
    assignFormProperties,
    injectStore,
    storeToRefs, useTranslationsForGroup,
} from '../../../core';
import { useIsEditing, useUpdatedAt } from '../../../composables';

export default defineComponent({
    components: {
        AFormSubmit, ARealmPicker, AFormInputList, IVuelidate,
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

        const vuelidate = useVuelidate({
            name: {
                required,
                [
                VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT
                ]: VuelidateCustomRule[VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT],
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            display_name: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            description: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            realm_id: {
                required,
            },
            redirect_uri: {
                // todo: url is required!
                maxLength: maxLength(2000),
            },
            is_confidential: {

            },
            secret: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            secret_hashed: {

            },
        }, form);

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const manager = defineEntityManager({
            type: `${EntityType.CLIENT}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);
        const updatedAt = useUpdatedAt(props.entity);

        const isNameFixed = computed(() => !!props.name && props.name.length > 0);
        const realmId = computed(() => (manager.data.value ?
            manager.data.value.realm_id :
            storeRefs.realmId.value));

        const generateSecret = () => createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_!.', 32);
        const isSecretHashed = computed(
            () => manager.data.value && manager.data.value.secret === form.secret && form.secret.startsWith('$'),
        );

        function initForm() {
            if (props.name) {
                form.name = props.name;
            }

            assignFormProperties(form, manager.data.value);

            form.realm_id = realmId.value ?? '';

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
            if (vuelidate.value.$invalid) {
                return;
            }

            await manager.createOrUpdate({
                ...form,
                secret: isSecretHashed.value ? '' : form.secret,
            });
        };

        const translationsClient = useTranslationsForGroup(
            TranslatorTranslationGroup.CLIENT,
            [
                { key: TranslatorTranslationClientKey.NAME_HINT },
                { key: TranslatorTranslationClientKey.DESCRIPTION_HINT },
                { key: TranslatorTranslationClientKey.REDIRECT_URI_HINT },
                { key: TranslatorTranslationClientKey.IS_CONFIDENTIAL },
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

        const redirectUris = computed(() => (vuelidate.value.redirect_uri.$model ?
            vuelidate.value.redirect_uri.$model.split(',') :
            []));

        return {
            translationsDefault,
            translationsClient,

            vuelidate,
            data: manager.data,
            isNameFixed,
            isBusy: manager.busy.value,
            isEditing,

            isSecretHashed,
            generateSecret,

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
                            v-model="vuelidate.name.$model"
                            :disabled="isNameFixed"
                        />
                    </VCFormGroup>
                    <small>{{ translationsClient.nameHint }}</small>
                </template>
            </IVuelidate>

            <hr>

            <IVuelidate :validation="vuelidate.display_name">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <template #label>
                            {{ translationsDefault.displayName }}
                        </template>
                        <VCFormInput
                            v-model="vuelidate.display_name.$model"
                            :disabled="isNameFixed"
                        />
                    </VCFormGroup>
                </template>
            </IVuelidate>

            <hr>

            <IVuelidate :validation="vuelidate.secret">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <template #label>
                            {{ translationsDefault.secret }}

                            <template v-if="isSecretHashed">
                                <span class="text-danger font-weight-bold">
                                    <i class="fa fa-exclamation-triangle" />
                                </span>
                            </template>
                        </template>
                        <VCFormInput
                            v-model="vuelidate.secret.$model"
                            :disabled="!vuelidate.is_confidential.$model"
                        >
                            <template #groupAppend>
                                <button
                                    class="btn"
                                    type="button"
                                    @click.prevent="() => vuelidate.secret.$model = generateSecret()"
                                >
                                    <i class="fa fa-refresh" />
                                </button>
                            </template>
                        </VCFormInput>
                    </VCFormGroup>
                </template>
            </IVuelidate>
            <div class="row">
                <div class="col">
                    <IVuelidate :validation="vuelidate.is_confidential">
                        <template #default="props">
                            <VCFormGroup
                                :validation-messages="props.data"
                                :validation-severity="props.severity"
                            >
                                <VCFormInputCheckbox
                                    v-model="vuelidate.is_confidential.$model"
                                    :group-class="'form-switch'"
                                    :label="true"
                                    :label-content="translationsClient.isConfidential.value"
                                />
                            </VCFormGroup>
                        </template>
                    </IVuelidate>
                </div>
                <div class="col">
                    <IVuelidate :validation="vuelidate.secret_hashed">
                        <template #default="props">
                            <VCFormGroup
                                :validation-messages="props.data"
                                :validation-severity="props.severity"
                            >
                                <VCFormInputCheckbox
                                    v-model="vuelidate.secret_hashed.$model"
                                    :group-class="'form-switch'"
                                    :label="true"
                                    :label-content="translationsClient.hashSecret.value"
                                />
                            </VCFormGroup>
                        </template>
                    </IVuelidate>
                </div>
            </div>

            <template v-if="!realmId && !isEditing">
                <hr>
                <IVuelidate :validation="vuelidate.realm_id">
                    <template #default="props">
                        <VCFormGroup
                            :validation-messages="props.data"
                            :validation-severity="props.severity"
                        >
                            <template #label>
                                {{ translationsDefault.realm }}
                            </template>
                            <template #default>
                                <ARealmPicker
                                    :value="vuelidate.realm_id.$model"
                                    @change="(input: string[]) => {

                                        vuelidate.realm_id.$model = input.length > 0 ? input[0] : '';
                                    }"
                                />
                            </template>
                        </VCFormGroup>
                    </template>
                </IVuelidate>
            </template>
        </div>
        <div class="col">
            <AFormInputList
                :names="redirectUris"
                @changed="(value) => {
                    if (value.length === 0) {
                        vuelidate.redirect_uri.$model = '';
                        return;
                    }
                    vuelidate.redirect_uri.$model = value.join(',');
                }"
            >
                <template #label>
                    {{ translationsDefault.redirectUris }}
                </template>
            </AFormInputList>
            <small>{{ translationsClient.redirectURIHint }}</small>

            <hr>

            <IVuelidate :validation="vuelidate.description">
                <template #default="props">
                    <VCFormGroup
                        :validation-messages="props.data"
                        :validation-severity="props.severity"
                    >
                        <template #label>
                            {{ translationsDefault.description }}
                        </template>
                        <VCFormTextarea
                            v-model="vuelidate.description.$model"
                            rows="7"
                        />
                    </VCFormGroup>

                    <small>{{ translationsClient.descriptionHint }}</small>
                </template>
            </IVuelidate>

            <hr>

            <div>
                <AFormSubmit
                    :is-busy="isBusy"
                    :is-editing="isEditing"
                    :is-invalid="vuelidate.$invalid"
                    @submit="submit"
                />
            </div>
        </div>
    </div>
</template>
