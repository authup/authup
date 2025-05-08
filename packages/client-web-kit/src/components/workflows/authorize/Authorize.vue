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
import {
    computed, defineComponent, h, ref,
} from 'vue';
import type { LocationQuery } from 'vue-router';
import { injectHTTPClient, injectStore } from '../../../core';
import Login from '../Login.vue';
import AuthorizeConfirm from './AuthorizeConfirm.vue';
import AuthorizeError from './AuthorizeError.vue';
import type { OAuth2QueryParameters } from './helpers';
import { extractOAuth2QueryParameters, isGlobMatch } from './helpers';

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
    components: {
        AuthorizeError,
        AuthorizeConfirm,
        Login,
    },
    props: {
        query: {
            type: Object as PropType<LocationQuery>,
            required: true,
        },
    },
    emits: ['redirect'],
    setup(props) {
        const httpClient = injectHTTPClient();

        const store = injectStore();
        const { loggedIn } = storeToRefs(store);

        let parameters : OAuth2QueryParameters;

        try {
            parameters = extractOAuth2QueryParameters(props.query);
        } catch (e) {
            const node = wrapChild(h(AuthorizeError, {
                message: e instanceof Error ? e.message : 'The query parameters are invalid.',
            }));

            return () => node;
        }

        const entity : Ref<Client | null> = ref(null);
        const error : Ref<string | null> = ref(null);

        const load = async () => {
            try {
                entity.value = await httpClient
                    .client
                    .getOne(parameters.client_id);
            } catch (e: any) {
                error.value = e instanceof Error ? e.message : 'The client_id is invalid.';
            }
        };

        Promise.resolve()
            .then(load);

        const redirectUriPatterns = computed(() => {
            if (
                entity.value &&
                entity.value.redirect_uri
            ) {
                return entity.value.redirect_uri.split(',');
            }

            return [];
        });

        return () => {
            if (!entity.value) {
                if (error.value) {
                    return wrapChild(h(AuthorizeError, {
                        message: error.value,
                    }));
                }

                return [];
            }

            if (
                parameters.redirect_uri &&
                redirectUriPatterns.value.length > 0 &&
                !isGlobMatch(parameters.redirect_uri, redirectUriPatterns.value)
            ) {
                return wrapChild(h(AuthorizeError, {
                    message: 'The redirect_uri does not match.',
                }));
            }

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
