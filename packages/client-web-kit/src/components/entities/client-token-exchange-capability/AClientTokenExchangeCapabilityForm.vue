<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import {
    CLIENT_TOKEN_EXCHANGE_MAX_AGE,
    ClientTokenExchangeCapabilityValidator,
    ClientTokenExchangeRealmScope,
    EntityType,
} from '@authup/core-kit';
import type { ClientTokenExchangeCapability } from '@authup/core-kit';
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
            type: Object as PropType<ClientTokenExchangeCapability>,
            default: undefined,
        },
        clientId: {
            type: String,
            required: true,
        },
    },
    emits: defineEntityVEmitOptions<ClientTokenExchangeCapability>(),
    setup(props, ctx) {
        const form = reactive({
            audience: '',
            value: '',
            maxAge: LIFETIME_DEFAULT,
            realmScope: ClientTokenExchangeRealmScope.OWN as `${ClientTokenExchangeRealmScope}`,
        });

        const manager = defineEntityManager({
            type: EntityType.CLIENT_TOKEN_EXCHANGE_CAPABILITY,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);

        // The form always holds all four values, so an update validates as a
        // create: under the UPDATE group a cleared field passes here and is
        // refused by the server.
        const v = useValidup(
            new ClientTokenExchangeCapabilityValidator({ pathsToInclude: ['audience', 'value', 'maxAge', 'realmScope'] }),
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
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_CAPABILITY_VALUE },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_CAPABILITY_VALUE_HINT },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_MAX_AGE },
                {
                    key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_MAX_AGE_HINT,
                    data: { max: CLIENT_TOKEN_EXCHANGE_MAX_AGE },
                },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_REALM_SCOPE },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_REALM_SCOPE_HINT },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_REALM_SCOPE_OWN },
                { key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_REALM_SCOPE_ANY },
            ],
        );

        const realmScopeOptions = computed<FormOption[]>(() => [
            { value: ClientTokenExchangeRealmScope.OWN, label: translations.tokenExchangeRealmScopeOwn },
            { value: ClientTokenExchangeRealmScope.ANY, label: translations.tokenExchangeRealmScopeAny },
        ]);

        return {
            busy: manager.busy,
            isEditing,
            submit,
            realmScopeOptions,
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
            :field="v.fields.value"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.tokenExchangeCapabilityValue }}
                </template>
                <VCFormInput v-model="v.fields.value.$model.value" />
                <template #hint>
                    {{ translations.tokenExchangeCapabilityValueHint }}
                </template>
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.maxAge"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.tokenExchangeMaxAge }}
                </template>
                <VCFormInput
                    type="number"
                    :model-value="`${v.fields.maxAge.$model.value ?? 0}`"
                    @update:model-value="(next: string) => { v.fields.maxAge.$model.value = Number(next); }"
                />
                <template #hint>
                    {{ translations.tokenExchangeMaxAgeHint }}
                </template>
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.realmScope"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.tokenExchangeRealmScope }}
                </template>
                <VCFormSelect
                    v-model="v.fields.realmScope.$model.value"
                    :options="realmScopeOptions"
                />
                <template #hint>
                    {{ translations.tokenExchangeRealmScopeHint }}
                </template>
            </VCFormGroup>
        </IFieldValidation>

        <div class="flex items-center gap-2">
            <AFormSubmit
                :is-busy="busy"
                :is-editing="isEditing"
                :is-invalid="v.$invalid.value"
                @submit="submit"
            />
            <slot name="actions" />
        </div>
    </form>
</template>
