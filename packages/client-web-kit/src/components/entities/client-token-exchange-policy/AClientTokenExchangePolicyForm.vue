<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import {
    CLIENT_TOKEN_EXCHANGE_MAX_LIFETIME,
    ClientTokenExchangePolicyValidator,
    ClientTokenExchangeSubjectRealmScope,
    EntityType,
} from '@authup/core-kit';
import type { ClientTokenExchangePolicy } from '@authup/core-kit';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { ValidatorGroup } from '@authup/kit';
import { IFieldValidation } from '@ilingo/validup-vue';
import { useValidup } from '@validup/vue';
import { VCFormGroup, VCFormInput, VCFormSelect } from '@vuecs/forms';
import type { FormOption } from '@vuecs/forms';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    watch,
} from 'vue';
import { useIsEditing, useUpdatedAt } from '../../../composables';
import { assignFormProperties, useTranslationsForNamespace } from '../../../core';
import { AFormSubmit, defineEntityManager, defineEntityVEmitOptions } from '../../utility';

const LIFETIME_DEFAULT = 3600;

export default defineComponent({
    components: {
        AFormSubmit,
        IFieldValidation,
        VCFormGroup,
        VCFormInput,
        VCFormSelect,
    },
    props: {
        entity: {
            type: Object as PropType<ClientTokenExchangePolicy>,
            default: undefined,
        },
        clientId: {
            type: String,
            required: true,
        },
    },
    emits: defineEntityVEmitOptions<ClientTokenExchangePolicy>(),
    setup(props, ctx) {
        const form = reactive({
            audience: '',
            capabilityTypes: '',
            maxLifetime: LIFETIME_DEFAULT,
            subjectRealmScope: ClientTokenExchangeSubjectRealmScope.OWN as `${ClientTokenExchangeSubjectRealmScope}`,
        });

        const manager = defineEntityManager({
            type: EntityType.CLIENT_TOKEN_EXCHANGE_POLICY,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        // The form always holds all four values, so an update validates as a
        // create: under the UPDATE group a cleared field passes here and is
        // refused by the server.
        const v = useValidup(
            new ClientTokenExchangePolicyValidator({ pathsToInclude: ['audience', 'capabilityTypes', 'maxLifetime', 'subjectRealmScope'] }),
            form,
            { group: ValidatorGroup.CREATE },
        );

        const updatedAt = useUpdatedAt(() => props.entity);

        function initForm() {
            assignFormProperties(form, manager.data.value, { fields: v.fields });
        }

        watch(updatedAt, (val, oldVal) => {
            if (!val || val === oldVal) {
                return;
            }

            manager.data.value = props.entity;
            initForm();
        });

        initForm();

        const submit = async () => {
            if (v.$invalid.value) {
                return;
            }

            await manager.createOrUpdate({
                ...form,
                ...(isEditing.value ? {} : { clientId: props.clientId }),
            });
        };

        const translations = useTranslationsForNamespace(
            TranslatorTranslationNamespace.CLIENT,
            [
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_AUDIENCE },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_AUDIENCE_HINT },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_CAPABILITY_TYPES },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_CAPABILITY_TYPES_HINT },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_MAX_LIFETIME },
                {
                    key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_MAX_LIFETIME_HINT,
                    data: { max: CLIENT_TOKEN_EXCHANGE_MAX_LIFETIME },
                },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_SUBJECT_REALM_SCOPE },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_SUBJECT_REALM_SCOPE_HINT },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_SUBJECT_REALM_SCOPE_OWN },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_SUBJECT_REALM_SCOPE_ANY },
            ],
        );

        const subjectRealmScopeOptions = computed<FormOption[]>(() => [
            { value: ClientTokenExchangeSubjectRealmScope.OWN, label: translations.tokenExchangeSubjectRealmScopeOwn },
            { value: ClientTokenExchangeSubjectRealmScope.ANY, label: translations.tokenExchangeSubjectRealmScopeAny },
        ]);

        return {
            busy: manager.busy,
            isEditing,
            submit,
            subjectRealmScopeOptions,
            translations,
            v,
        };
    },
});
</script>

<template>
    <form @submit.prevent="submit">
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.audience"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.tokenExchangeAudience }}
                </template>
                <VCFormInput v-model="v.fields.audience.$model.value" />
                <template #hint>
                    {{ translations.tokenExchangeAudienceHint }}
                </template>
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.capabilityTypes"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.tokenExchangeCapabilityTypes }}
                </template>
                <VCFormInput v-model="v.fields.capabilityTypes.$model.value" />
                <template #hint>
                    {{ translations.tokenExchangeCapabilityTypesHint }}
                </template>
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.maxLifetime"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.tokenExchangeMaxLifetime }}
                </template>
                <VCFormInput
                    type="number"
                    :model-value="`${v.fields.maxLifetime.$model.value ?? 0}`"
                    @update:model-value="(next: string) => { v.fields.maxLifetime.$model.value = Number(next); }"
                />
                <template #hint>
                    {{ translations.tokenExchangeMaxLifetimeHint }}
                </template>
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.subjectRealmScope"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.tokenExchangeSubjectRealmScope }}
                </template>
                <VCFormSelect
                    v-model="v.fields.subjectRealmScope.$model.value"
                    :options="subjectRealmScopeOptions"
                />
                <template #hint>
                    {{ translations.tokenExchangeSubjectRealmScopeHint }}
                </template>
            </VCFormGroup>
        </IFieldValidation>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="v.$invalid.value"
            @submit="submit"
        />
    </form>
</template>
