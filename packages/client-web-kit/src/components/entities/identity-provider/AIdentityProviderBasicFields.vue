<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    VuelidateCustomRule,
    VuelidateCustomRuleKey,
    assignFormProperties,
    useTranslationsForGroup,
} from '../../../core';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
} from 'vue';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
import { IVuelidate } from '@ilingo/vuelidate';
import { onChange, useUpdatedAt } from '../../../composables';

export const AIdentityProviderBasicFields = defineComponent({
    components: {
        IVuelidate,
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

        const $v = useVuelidate({
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
                [VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT]: VuelidateCustomRule[
                    VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE_DOT
                ],
            },
            display_name: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            enabled: { required },
        }, form, { $registerAs: 'basic' });

        const isNameEmpty = computed(() => !form.name || form.name.length === 0);

        function generateId() {
            form.name = createNanoID();
        }

        const update = () => {
            setup.emit('updated', {
                data: form,
                valid: !$v.value.$invalid,
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

        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
            ],
        );

        const onEnabledChange = (value: boolean) => {
            $v.value.enabled.$model = value;
            update();
        };

        const onGenerate = () => {
            generateId();
            update();
        };

        return {
            vuelidate: $v,
            translationsDefault,
            onGenerate,
            onEnabledChange,
        };
    },
});

export default AIdentityProviderBasicFields;
</script>

<template>
    <div>
        <IVuelidate :validation="vuelidate.name">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        {{ translationsDefault.name }}
                    </template>
                    <VCFormInput v-model="vuelidate.name.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <div class="mb-3">
            <button
                type="button"
                class="btn btn-xs btn-dark"
                @click.prevent="onGenerate"
            >
                <VCIcon name="fa6-solid:arrows-rotate" /> Generate
            </button>
        </div>

        <IVuelidate :validation="vuelidate.display_name">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        {{ translationsDefault.displayName }}
                    </template>
                    <VCFormInput v-model="vuelidate.display_name.$model" />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <div class="mt-3">
            <VCFormSwitch
                :model-value="vuelidate.enabled.$model"
                :label="true"
                label-content="Enabled?"
                @update:model-value="onEnabledChange"
            />
        </div>
    </div>
</template>
