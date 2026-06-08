<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Client, Scope } from '@authup/core-kit';
import { deserializeOAuth2Scope } from '@authup/specs';
import type { PropType } from 'vue';
import { computed, defineComponent, ref } from 'vue';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationNamespace,
    injectHTTPClient,
    useTranslationsForNamespace,
} from '../../../core';
import AuthorizeScope from './AuthorizeScope.vue';

export default defineComponent({
    components: { AuthorizeScope },
    props: {
        client: {
            type: Object as PropType<Client>,
            required: true,
        },
        scopesAvailable: { type: Array as PropType<Scope[]> },
        scopesRequested: { type: [String, Array] as PropType<string[] | string> },
    },
    setup(props) {
        const httpClient = injectHTTPClient();

        const translationsClient = useTranslationsForNamespace(
            TranslatorTranslationNamespace.CLIENT,
            [
                {
                    key: TranslatorTranslationClientKey.SCOPE_GRANT_INTRO,
                    data: { client: props.client.name },
                },
            ],
        );

        const scopesRequestedNormalized = computed<string[]>(() => {
            if (!props.scopesRequested) {
                return [];
            }

            return Array.isArray(props.scopesRequested) ?
                props.scopesRequested :
                deserializeOAuth2Scope(props.scopesRequested);
        });

        const scopesAvailableNormalized = ref<Scope[]>([]);

        const resolveScopesAvailable = async () => {
            if (props.scopesAvailable) {
                scopesAvailableNormalized.value = props.scopesAvailable;
                return;
            }

            if (props.client.id) {
                const { data: clientScopes } = await httpClient.clientScope.getMany({
                    filters: { client_id: props.client.id },
                    include: ['scope'],
                });

                scopesAvailableNormalized.value = clientScopes.map((clientScope) => clientScope.scope);
            }
        };

        Promise.resolve()
            .then(() => resolveScopesAvailable());

        return {
            scopesRequestedNormalized,
            scopesAvailableNormalized,
            translationsClient,
        };
    },
});
</script>
<template>
    <div v-if="scopesAvailableNormalized.length > 0">
        <div>
            {{ translationsClient.scopeGrantIntro }}
        </div>
        <div class="flex-col">
            <template
                v-for="item in scopesAvailableNormalized"
                :key="item.id"
            >
                <AuthorizeScope
                    :entity="item"
                    class="flex flex-row gap-1"
                    :requested="scopesRequestedNormalized"
                />
            </template>
        </div>
    </div>
</template>
