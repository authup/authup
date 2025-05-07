<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Client } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import type { PropType, Ref, VNodeChild } from 'vue';
import { defineComponent, h, ref } from 'vue';
import type { LocationQuery } from 'vue-router';
import AuthorizeConfirm from './AuthorizeConfirm.vue';
import { extractOAuth2QueryParameters, isGlobMatch } from './helpers';
import AuthorizeError from './AuthorizeError.vue';
import type { OAuth2QueryParameters } from './helpers';
import { injectHTTPClient, injectStore } from '../../../core';
import Login from '../Login.vue';

const wrapChild = (child: VNodeChild) => h(
    'div',
    { class: 'd-flex align-items-center justify-content-center h-100' },
    [
        h(
            'div',
            { class: 'authorize' },
            [
                child,
            ],
        ),
    ],
);

export default defineComponent({
    props: {
        query: {
            type: Object as PropType<LocationQuery>,
            required: true,
        },
    },
    emits: ['redirect'],
    async setup(props) {
        const httpClient = injectHTTPClient();

        const store = injectStore();
        const { loggedIn } = storeToRefs(store);

        let parameters : OAuth2QueryParameters;

        try {
            parameters = extractOAuth2QueryParameters(props.query);
        } catch (e) {
            return () => wrapChild(h(AuthorizeError, {
                message: e.message,
            }));
        }

        let entity : Ref<Client>;

        try {
            const response = await httpClient
                .client
                .getOne(parameters.client_id);

            entity = ref(response);
        } catch (e: any) {
            return () => wrapChild(h(AuthorizeError, {
                message: e instanceof Error ? e.message : 'The client_id is invalid.',
            }));
        }

        const redirectUriPatterns : string[] = [];
        if (
            entity.value &&
            entity.value.redirect_uri
        ) {
            redirectUriPatterns.push(...entity.value.redirect_uri.split(','));
        }

        if (
            parameters.redirect_uri &&
            !isGlobMatch(parameters.redirect_uri, redirectUriPatterns)
        ) {
            return () => wrapChild(h(AuthorizeError, {
                message: 'The redirect_uri does not match.',
            }));
        }

        return () => {
            if (!loggedIn.value) {
                return wrapChild(h(Login, {
                    clientId: entity.value.id,
                    realmId: entity.value.realm_id,
                    redirectUri: parameters.redirect_uri,
                }));
            }

            return wrapChild(h(AuthorizeConfirm, {
                params: parameters,
                entity: entity.value,
            }));
        };
    },
});
</script>
<style>
.authorize {
    padding: 1rem;
    background: #E8E8E8;
    min-width: 480px;
    max-width: 100%;
    min-height: 300px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    border-radius: 5px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.24);
}
</style>
