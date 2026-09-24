<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, IdentityProviderEnrollmentAttributes, Policy } from '@authup/core-kit';
import { IdentityProviderEnrollmentAttributesValidator } from '@authup/core-kit';
import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { ValidatorGroup } from '@authup/kit';
import { IFieldValidation } from '@ilingo/validup-vue';
import { defineQuery } from '@rapiq/core';
import { useValidup } from '@validup/vue';
import { VCFormGroup, VCFormSwitch } from '@vuecs/forms';
import type { PropType } from 'vue';
import { computed, defineComponent, reactive } from 'vue';
import { onChange, useIsEditing, useUpdatedAt } from '../../../composables';
import { assignFormProperties, useTranslations } from '../../../core';
import APolicyPicker from '../policy/APolicyPicker.vue';

export default defineComponent({
    components: {
        APolicyPicker,
        IFieldValidation,
        VCFormGroup,
        VCFormSwitch,
    },
    props: {
        entity: { type: Object as PropType<Partial<IdentityProvider>> },
        realmId: {
            type: String,
            default: undefined,
        },
    },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive({
            enrollmentEnabled: true as boolean,
            enrollmentPolicyId: null as string | null,
        });

        const isEditing = useIsEditing(computed(() => props.entity as IdentityProvider));

        // Registers under the parent `<AIdentityProviderOAuth2Form>` /
        // `<AIdentityProviderLdapForm>` collectors via `name: 'enrollment'`.
        const v = useValidup(
            new IdentityProviderEnrollmentAttributesValidator(),
            form,
            {
                name: 'enrollment',
                group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)),
            },
        );

        // Both keys are optional on the attributes type; the dynamic
        // accessor materialises the state like the sibling sub-forms do.
        const enabledField = v.fields.at<boolean | null>('enrollmentEnabled');
        const policyField = v.fields.at<string | null>('enrollmentPolicyId');

        const policyRealmId = computed(() => props.realmId || props.entity?.realmId);
        const policyRealmIds = computed<(string | null)[]>(() => [...(policyRealmId.value ? [policyRealmId.value] : []), null]);
        const policyQuery = computed(() => defineQuery<Policy>({ filters: { realmId: policyRealmIds.value } }));

        const update = () => {
            setup.emit('updated', {
                data: form,
                valid: !v.$invalid.value,
            });
        };

        function assign(data: Partial<IdentityProviderEnrollmentAttributes> = {}) {
            assignFormProperties(form, data, { fields: v.fields });

            // null and undefined both mean enabled; the switch needs a boolean.
            if (typeof form.enrollmentEnabled !== 'boolean') {
                form.enrollmentEnabled = true;
            }

            // a stored null hydrates as '', which the server refuses as a uuid;
            // "no policy" is null on the wire and in the picker alike.
            if (form.enrollmentPolicyId === '') {
                form.enrollmentPolicyId = null;
            }
        }

        setup.expose({ assign });

        const entityAttributes = () => props.entity as Partial<IdentityProvider & IdentityProviderEnrollmentAttributes>;

        const updatedAt = useUpdatedAt(() => props.entity as IdentityProvider);
        onChange(updatedAt, () => assign(entityAttributes()));

        assign(entityAttributes());

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.ENROLLMENT_ENABLED,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.ENROLLMENT_ENABLED_HINT,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.ENROLLMENT_POLICY,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.ENROLLMENT_POLICY_HINT,
            },
        ]);

        const onEnabledChange = (value: boolean) => {
            enabledField.$model.value = value;
            update();
        };

        const onPolicyChange = (input: string[]) => {
            policyField.$model.value = input.length > 0 ? input[0] ?? null : null;
            update();
        };

        return {
            v,
            enabledField,
            policyField,
            policyQuery,
            translations,
            onEnabledChange,
            onPolicyChange,
        };
    },
});

</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="enabledField"
        >
            <VCFormGroup :validation="value">
                <VCFormSwitch
                    :model-value="enabledField.$model.value"
                    :label="true"
                    :label-content="translations.enrollmentEnabled"
                    @update:model-value="onEnabledChange"
                />
                <template #hint>
                    {{ translations.enrollmentEnabledHint }}
                </template>
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="policyField"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.enrollmentPolicy }}
                </template>
                <template #default>
                    <APolicyPicker
                        :value="policyField.$model.value"
                        :query="policyQuery"
                        @change="onPolicyChange"
                    />
                </template>
                <template #hint>
                    {{ translations.enrollmentPolicyHint }}
                </template>
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
