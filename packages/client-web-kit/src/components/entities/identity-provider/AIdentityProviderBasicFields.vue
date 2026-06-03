<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider } from '@authup/core-kit';
import { IdentityProviderValidator } from '@authup/core-kit';
import { ValidatorGroup, createNanoID } from '@authup/kit';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationNamespace,
    assignFormProperties,
    useFieldValidation, 
    useTranslationsForNamespace, 
} from '../../../core';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
} from 'vue';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
import { onChange, useIsEditing, useUpdatedAt } from '../../../composables';

export const AIdentityProviderBasicFields = defineComponent({
    components: {
        VCFormGroup,
        VCFormInput,
        VCFormSwitch,
    },
    props: { entity: { type: Object as PropType<Partial<IdentityProvider>> } },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive({
            name: '',
            display_name: '',
            enabled: true,
        });

        const isEditing = useIsEditing(computed(() => props.entity as IdentityProvider));

        // Shared `IdentityProviderValidator` from `@authup/core-kit`.
        // Registers under the parent `<AIdentityProviderOAuth2Form>` /
        // `<AIdentityProviderLdapForm>` collectors via `name: 'basic'`.
        const v = useValidup(
            new IdentityProviderValidator(),
            form,
            {
                name: 'basic',
                group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)),
            },
        );

        const isNameEmpty = computed(() => !form.name || form.name.length === 0);

        function generateId() {
            form.name = createNanoID();
        }

        const update = () => {
            setup.emit('updated', {
                data: form,
                valid: !v.$invalid.value,
            });
        };

        function assign(data: Partial<IdentityProvider> = {}) {
            assignFormProperties(form, data);

            if (isNameEmpty.value) {
                generateId();
            }
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const translationsDefault = useTranslationsForNamespace(
            TranslatorTranslationNamespace.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
            ],
        );

        const onEnabledChange = (value: boolean) => {
            v.fields.enabled.$model.value = value;
            update();
        };

        const onGenerate = () => {
            generateId();
            update();
        };

        return {
            v,
            translationsDefault,
            onGenerate,
            onEnabledChange,
            useFieldValidation,
        };
    },
});

export default AIdentityProviderBasicFields;
</script>

<template>
    <div>
        <VCFormGroup :validation="useFieldValidation(v.fields.name)">
            <template #label>
                {{ translationsDefault.name }}
            </template>
            <VCFormInput v-model="v.fields.name.$model.value" />
        </VCFormGroup>

        <div class="mb-3">
            <button
                type="button"
                class="btn btn-xs btn-dark"
                @click.prevent="onGenerate"
            >
                <VCIcon name="fa6-solid:arrows-rotate" /> Generate
            </button>
        </div>

        <VCFormGroup :validation="useFieldValidation(v.fields.display_name)">
            <template #label>
                {{ translationsDefault.displayName }}
            </template>
            <VCFormInput
                :model-value="v.fields.display_name.$model.value ?? ''"
                @update:model-value="(next: string) => { v.fields.display_name.$model.value = next; }"
            />
        </VCFormGroup>

        <div class="mt-3">
            <VCFormSwitch
                :model-value="v.fields.enabled.$model.value"
                :label="true"
                label-content="Enabled?"
                @update:model-value="onEnabledChange"
            />
        </div>
    </div>
</template>
