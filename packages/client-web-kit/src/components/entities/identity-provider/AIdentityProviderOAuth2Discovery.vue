<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { Client } from '@authup/core-http-kit';
import { isOpenIDProviderMetadata } from '@authup/specs';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { z } from 'zod';
import {
    computed,
    defineComponent,
    reactive,
    ref,
} from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { IFieldValidation } from '@ilingo/validup-vue';

// Standalone form (not a registered child) — uses its own URL
// validator since `@authup/core-kit` doesn't ship a "discovery URL"
// validator and this is a one-off field whose validation lives in
// the consumer.
class DiscoveryUrlValidator extends Container<{ url: string }> {
    protected override initialize() {
        super.initialize();
        this.mount('url', { optional: true }, createValidator(z.url()));
    }
}

export const AIdentityProviderOAuth2Discovery = defineComponent({
    components: {
        VCFormGroup, 
        VCFormInput, 
        IFieldValidation, 
    },
    emits: ['lookup', 'failed'],
    setup(_, setup) {
        const busy = ref(false);
        const form = reactive({ url: '' });

        // Detached so it doesn't register with the parent OAuth2 form
        // collector — it's a sibling helper, not part of the submit
        // payload.
        const v = useValidup(new DiscoveryUrlValidator(), form, { detached: true });

        const lookupValid = ref(false);
        const message = ref<string | null>(null);

        const apiClient = new Client();

        const lookup = async () => {
            if (busy.value || v.fields.url.$invalid.value) {
                return;
            }

            busy.value = true;
            message.value = null;
            lookupValid.value = false;

            try {
                const response = await apiClient.get(form.url);
                if (isOpenIDProviderMetadata(response.data)) {
                    setup.emit('lookup', response.data);
                    lookupValid.value = true;
                }
            } catch (e) {
                lookupValid.value = false;

                if (e instanceof Error) {
                    message.value = `Lookup failed with: ${e.message}`;
                    setup.emit('failed', e);
                }
            } finally {
                busy.value = false;
            }
        };

        const isDisabled = computed(() => busy.value || !form.url || v.$invalid.value);

        return {
            v,
            message,
            lookupValid,
            isDisabled,
            lookup,
        };
    },
});

export default AIdentityProviderOAuth2Discovery;
</script>

<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.url"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    Discovery
                </template>
                <VCFormInput
                    v-model="v.fields.url.$model.value"
                    :class="{ 'is-valid': lookupValid }"
                    placeholder="https://example.com/.well-known/openid-configuration"
                />
            </VCFormGroup>
        </IFieldValidation>
        <div
            v-if="message"
            class="alert alert-sm alert-warning"
        >
            {{ message }}
        </div>
        <button
            type="button"
            class="btn btn-xs btn-primary mb-1"
            :disabled="isDisabled"
            @click.prevent="lookup"
        >
            <VCIcon
                name="fa6-solid:magnifying-glass"
                class="pe-1"
            /> Lookup
        </button>
    </div>
</template>
