<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { Client } from '@authup/core-http-kit';
import { isOpenIDProviderMetadata } from '@authup/specs';
import useVuelidate from '@vuelidate/core';
import { url } from '@vuelidate/validators';
import {
    computed,
    defineComponent,
    reactive,
    ref,
} from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { IVuelidate } from '@ilingo/vuelidate';

export const AIdentityProviderOAuth2Discovery = defineComponent({
    components: {
        IVuelidate, 
        VCFormGroup, 
        VCFormInput, 
    },
    emits: ['lookup', 'failed'],
    setup(_, setup) {
        const busy = ref(false);
        const form = reactive({ url: '' });

        const $v = useVuelidate({ url: { url } }, form);

        const lookupValid = ref(false);
        const message = ref<string | null>(null);

        const apiClient = new Client();

        const lookup = async () => {
            if (busy.value || $v.value.url.$invalid) {
                return;
            }

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

        const isDisabled = computed(() => !form.url || $v.value.$invalid);

        return {
            vuelidate: $v,
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
        <IVuelidate :validation="vuelidate.url">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Discovery
                    </template>
                    <VCFormInput
                        v-model="vuelidate.url.$model"
                        :class="{ 'is-valid': lookupValid }"
                        placeholder="https://example.com/.well-known/openid-configuration"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>
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
            <i class="fa fa-search pe-1" /> Lookup
        </button>
    </div>
</template>
