<script lang="ts">
import { defineQuery } from '@rapiq/core';
import { buildURL } from '@authup/kit';
import { TranslatorTranslationAppKey, TranslatorTranslationEntityKey, TranslatorTranslationNamespace } from '@authup/i18n';
import {
    AClientScopes,
    useEntityNameTranslator,
    useTranslations,
    useTranslationsForNamespace,
} from '@authup/client-web-kit';
import type { Client, ClientScope, Scope } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { VCFormInput, VCFormSwitch } from '@vuecs/forms';
import type { PropType } from 'vue';
import { computed, defineComponent, ref } from 'vue';
import { injectAdminConsoleConfig } from '../../../di';

export default defineComponent({
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

        const translateEntityName = useEntityNameTranslator();
        const scopeLabel = (scope: Scope) => translateEntityName(EntityType.SCOPE, scope);

        const translationsDefault = useTranslations(
            [
                {
                    namespace: TranslatorTranslationNamespace.ENTITY,
                    key: TranslatorTranslationEntityKey.SCOPE,
                    count: 2,
                },
            ],
        );

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.URL_GENERATOR },
                { key: TranslatorTranslationAppKey.URL_GENERATOR_HINT },
                { key: TranslatorTranslationAppKey.REDIRECT_URL },
                { key: TranslatorTranslationAppKey.GENERATED_URL },
            ],
        );

        const config = injectAdminConsoleConfig();

        const generatedUrl = computed(() => {
            const link = buildURL(config.apiUrl, 'authorize');

            link.searchParams.set('client_id', props.entity.id);
            link.searchParams.set('response_type', 'code');

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

        const query = computed(() => defineQuery<ClientScope>({
            filters: { clientId: props.entity.id },
            relations: ['scope'],
        }));

        return {
            toggleScope,
            query,
            redirectUri,
            generatedUrl,
            scopeLabel,
            scopes,
            translationsDefault,
            translationsApp,
        };
    },
});
</script>
<template>
    <div>
        <h6>{{ translationsApp.urlGenerator }}</h6>
        <div class="mb-1">
            {{ translationsApp.urlGeneratorHint }}
        </div>
        <AClientScopes
            :header="true"
            :query="query"
            :item="{class: ''}"
        >
            <template #header>
                <span>{{ translationsDefault.scope }}</span>
            </template>
            <template #item="props">
                <VCFormSwitch
                    :label="true"
                    :model-value="scopes.includes(props.data.scope.name)"
                    @update:model-value="toggleScope(props.data.scope.name)"
                >
                    <template #label="iProps">
                        <label :for="iProps.id">
                            {{ scopeLabel(props.data.scope) }}
                            <small
                                v-if="scopeLabel(props.data.scope) !== props.data.scope.name"
                                class="block text-fg-muted"
                            >{{ props.data.scope.name }}</small>
                        </label>
                    </template>
                </VCFormSwitch>
            </template>
        </AClientScopes>
        <VCFormGroup>
            <template #label>
                {{ translationsApp.redirectUrl }}
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
                {{ translationsApp.generatedUrl }}
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
