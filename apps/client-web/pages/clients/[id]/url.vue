<script lang="ts">
import { AClientScopes } from '@authup/client-web-kit';
import type { Client, ClientScope } from '@authup/core-kit';
import { VCFormInput, VCFormSwitch } from '@vuecs/forms';
import type { BuildInput } from 'rapiq';
import type { PropType } from 'vue';
import { computed, ref } from 'vue';
import { useRuntimeConfig } from '#app';
import { defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    components: {
        VCFormInput,
        VCFormSwitch,
        AClientScopes,
    },
    props: {
        entity: {
            type: Object as PropType<Client>,
            required: true,
        },
    },
    setup(props) {
        const scopes = ref<string[]>([]);
        const redirectUri = ref<string>('');

        const config = useRuntimeConfig();

        const generatedUrl = computed(() => {
            const link = new URL('authorize', config.public.apiUrl);
            link.searchParams.set('client_id', props.entity.id);
            link.searchParams.set('response_type', 'token');

            if (scopes.value.length > 0) {
                link.searchParams.set('scope', scopes.value.join(' '));
            }

            if (redirectUri.value) {
                link.searchParams.set('redirect_uri', redirectUri.value);
            }

            return link.href;
        });

        const toggleScope = (scope: string) => {
            const index = scopes.value.indexOf(scope);
            if (index === -1) {
                scopes.value.push(scope);
            } else {
                scopes.value.splice(index, 1);
            }
        };

        const query : BuildInput<ClientScope> = {
            filter: { client_id: props.entity.id },
            relations: ['scope'],
        };

        return {
            toggleScope,
            query,
            redirectUri,
            generatedUrl,
            scopes,
        };
    },
});
</script>
<template>
    <div>
        <h6>URL Generator</h6>
        <div class="mb-1">
            Generate an authorize url by picking the scopes it needs to function.
        </div>
        <AClientScopes
            :header="true"
            :query="query"
            :item="{class: ''}"
        >
            <template #header>
                <span>Scopes</span>
            </template>
            <template #item="props">
                <VCFormSwitch
                    :label="true"
                    :model-value="scopes.includes(props.data.scope.name)"
                    @update:model-value="toggleScope(props.data.scope.name)"
                >
                    <template #label="iProps">
                        <label :for="iProps.id">
                            {{ props.data.scope.name }}
                        </label>
                    </template>
                </VCFormSwitch>
            </template>
        </AClientScopes>
        <VCFormGroup>
            <template #label>
                Redirect URL
            </template>
            <template #default>
                <VCFormInput
                    v-model="redirectUri"
                    placeholder="..."
                />
            </template>
        </VCFormGroup>
        <VCFormGroup>
            <template #label>
                Generated URL
            </template>
            <template #default>
                <VCFormInput
                    v-model="generatedUrl"
                    :disabled="true"
                />
            </template>
        </VCFormGroup>
    </div>
</template>
