<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, LdapIdentityProvider } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { assignFormProperties, useTranslations } from '../../../core';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import {
    computed, 
    defineComponent, 
    reactive, 
    ref,
} from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { VCIcon } from '@vuecs/icon';
import { onChange, useUpdatedAt } from '../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        VCFormGroup,
        VCFormInput,
        VCIcon,
        IFieldValidation,
    },
    props: {
        entity: { type: Object as PropType<Partial<IdentityProvider>> },
        discovery: { type: Boolean, default: false },
    },
    emits: ['updated'],
    setup(props) {
        const form = reactive({ user: '', password: '' });

        const passwordShow = ref(false);

        const v = useValidup(new Container<typeof form>(), form, { name: 'credentials' });

        function init() {
            if (!props.entity) return;
            assignFormProperties(form, props.entity as Partial<LdapIdentityProvider>);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());
        init();

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.USER,
                count: 1,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PASSWORD,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.SHOW,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.HIDE,
            },
        ]);

        const passwordToggleLabel = computed(() => (passwordShow.value ? translations.hide : translations.show));

        return {
            v,
            passwordShow,
            passwordToggleLabel,
            translations,
        };
    },
});

</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.user"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.user }}
                </template>
                <VCFormInput v-model="v.fields.user.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.password"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.password }}
                </template>
                <VCFormInput
                    v-model="v.fields.password.$model.value"
                    :type="passwordShow ? 'text' : 'password'"
                    autocomplete="current-password"
                >
                    <template #groupAppend="{ class: appendClass }">
                        <button
                            type="button"
                            :class="appendClass"
                            class="cursor-pointer transition-colors hover:bg-bg-elevated"
                            :aria-label="passwordToggleLabel"
                            :title="passwordToggleLabel"
                            @click.prevent="passwordShow = !passwordShow"
                        >
                            <VCIcon
                                aria-hidden="true"
                                :name="passwordShow ? 'fa6-solid:eye-slash' : 'fa6-solid:eye'"
                            />
                        </button>
                    </template>
                </VCFormInput>
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
