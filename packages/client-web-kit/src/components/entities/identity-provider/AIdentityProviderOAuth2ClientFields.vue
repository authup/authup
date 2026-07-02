<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { assignFormProperties, useTranslations } from '../../../core';
import { Container } from 'validup';
import { createValidator } from '@validup/zod';
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
import { z } from 'zod';
import { onChange, useUpdatedAt } from '../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';

// Mirrors the client-credential rules of the server-side
// `IdentityProviderOAuth2{,Preset}AttributesValidator` (`@authup/core-kit`):
// `client_id` is required for every OAuth2/OIDC flavor, `client_secret`
// stays optional (a secret-less public-client token exchange is a valid
// provider config). The shared validators aren't reusable here — they
// carry required mounts (`preset`, endpoint URLs) that this sub-form's
// state doesn't own. The server is authoritative.
class OAuth2ClientFieldsValidator extends Container<{
    client_id: string;
    client_secret: string;
}> {
    protected override initialize() {
        super.initialize();
        this.mount('client_id', createValidator(z.string().min(3).max(128)));
        this.mount('client_secret', { optional: true }, createValidator(
            z.string().min(3).max(128).optional()
                .nullable(),
        ));
    }
}

export default defineComponent({
    components: {
        VCFormGroup,
        VCFormInput,
        VCIcon,
        IFieldValidation,
    },
    props: { entity: { type: Object as PropType<Partial<IdentityProvider>> } },
    emits: ['updated'],
    setup(props) {
        const form = reactive({ client_id: '', client_secret: '' });

        const secretShow = ref(false);

        const v = useValidup(new OAuth2ClientFieldsValidator(), form, { name: 'client' });

        function assign() {
            assignFormProperties(form, props.entity as Partial<OAuth2IdentityProvider>);
        }

        const updatedAt = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updatedAt, () => assign());
        assign();

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CLIENT_ID,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CLIENT_SECRET,
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

        const secretToggleLabel = computed(() => (secretShow.value ? translations.hide : translations.show));

        return {
            v,
            secretShow,
            secretToggleLabel,
            translations,
        };
    },
});

</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.client_id"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.clientId }}
                </template>
                <VCFormInput v-model="v.fields.client_id.$model.value" />
            </VCFormGroup>
        </IFieldValidation>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.client_secret"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translations.clientSecret }}
                </template>
                <VCFormInput
                    v-model="v.fields.client_secret.$model.value"
                    :type="secretShow ? 'text' : 'password'"
                    autocomplete="new-password"
                >
                    <template #groupAppend="{ class: appendClass }">
                        <button
                            type="button"
                            :class="appendClass"
                            class="cursor-pointer transition-colors hover:bg-bg-elevated"
                            :aria-label="secretToggleLabel"
                            :title="secretToggleLabel"
                            @click.prevent="secretShow = !secretShow"
                        >
                            <VCIcon
                                aria-hidden="true"
                                :name="secretShow ? 'fa6-solid:eye-slash' : 'fa6-solid:eye'"
                            />
                        </button>
                    </template>
                </VCFormInput>
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
