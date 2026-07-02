<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider } from '@authup/core-kit';
import { IdentityProviderValidator } from '@authup/core-kit';
import { ValidatorGroup, generateName } from '@authup/kit';
import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { assignFormProperties, useTranslations } from '../../../core';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    useId,
} from 'vue';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
import { onChange, useIsEditing, useUpdatedAt } from '../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';
import { ANameInput } from '../../utility';

export default defineComponent({
    components: {
        ANameInput,
        VCFormGroup,
        VCFormInput,
        VCFormSwitch,

        IFieldValidation,
    },
    props: { entity: { type: Object as PropType<Partial<IdentityProvider>> } },
    emits: ['updated'],
    setup(props, setup) {
        const nameSeed = useId();
        const form = reactive({
            name: '',
            display_name: '',
            enabled: true,
        });

        const isEditing = useIsEditing(computed(() => props.entity as IdentityProvider));

        // Shared `IdentityProviderValidator` from `@authup/core-kit`, scoped
        // via `pathsToInclude` to the keys this sub-form owns — the validator
        // also mounts `protocol` (required in every group, owned by the
        // parent form) and `realm_id`; unscoped, those would keep the
        // sub-form permanently invalid with the issue on an unrendered
        // field. Registers under the parent `<AIdentityProviderOAuth2Form>` /
        // `<AIdentityProviderLdapForm>` collectors via `name: 'basic'`.
        const v = useValidup(
            new IdentityProviderValidator({ pathsToInclude: ['name', 'display_name', 'enabled'] }),
            form,
            {
                name: 'basic',
                group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)),
            },
        );

        const isNameEmpty = computed(() => !form.name || form.name.length === 0);

        const update = () => {
            setup.emit('updated', {
                data: form,
                valid: !v.$invalid.value,
            });
        };

        function assign(data: Partial<IdentityProvider> = {}) {
            assignFormProperties(form, data);

            if (isNameEmpty.value) {
                form.name = generateName(nameSeed);
            }
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.DISPLAY_NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.ENABLED,
            },
        ]);

        const onEnabledChange = (value: boolean) => {
            v.fields.enabled.$model.value = value;
            update();
        };

        const onNameUpdate = (value: string) => {
            form.name = value;
            update();
        };

        return {
            v,
            translationsDefault,
            onNameUpdate,
            onEnabledChange,
        };
    },
});

</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.name"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translationsDefault.name }}
                </template>
                <ANameInput
                    :model-value="v.fields.name.$model.value"
                    @update:model-value="onNameUpdate"
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

        <div class="mt-3">
            <VCFormSwitch
                :model-value="v.fields.enabled.$model.value"
                :label="true"
                :label-content="translationsDefault.enabled"
                @update:model-value="onEnabledChange"
            />
        </div>
    </div>
</template>
