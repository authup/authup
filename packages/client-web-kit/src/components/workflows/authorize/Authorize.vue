<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type {
    Client, OAuth2AuthorizationCodeRequest, Scope,
} from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import type { PropType, VNodeChild } from 'vue';
import {
    Suspense, defineComponent, h, ref,
} from 'vue';
import { injectHTTPClient, injectStore } from '../../../core';
import Login from '../Login.vue';
import AuthorizeForm from './AuthorizeForm.vue';
import AuthorizeText from './AuthorizeText.vue';

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
        AuthorizeText,
        AuthorizeForm,
        Login,
    },
    props: {
        codeRequest: {
            type: Object as PropType<OAuth2AuthorizationCodeRequest>,
        },
        client: {
            type: Object as PropType<Client>,
        },
        clientId: {
            type: String,
        },
        scopes: {
            type: Array as PropType<Scope[]>,
        },
        error: {
            type: Object as PropType<Error>,
        },
    },
    emits: ['redirect'],
    setup(props) {
        const httpClient = injectHTTPClient();
        const store = injectStore();
        const { loggedIn } = storeToRefs(store);

        const error = ref<Error | null>(null);
        const client = ref<Client | null>(null);

        const resolve = async () => {
            if (props.error) {
                error.value = props.error;
                return;
            }

            if (props.client) {
                client.value = props.client;
            }

            if (props.clientId) {
                try {
                    client.value = await httpClient.client.getOne(props.clientId);
                } catch (e) {
                    if (e instanceof Error) {
                        error.value = e;
                    }
                }
            }
        };

        Promise.resolve()
            .then(() => resolve());

        return () => {
            if (error.value) {
                return wrapChild(h(AuthorizeText, {
                    message: error.value.message,
                    isError: true,
                }));
            }

            if (!props.codeRequest) {
                return [];
            }

            if (!loggedIn.value) {
                return wrapChild(h(Suspense, {}, {
                    default: () => h(Login, {
                        codeRequest: props.codeRequest,
                    }),
                    fallback: () => h(AuthorizeText, {
                        message: 'Loading...',
                    }),
                }));
            }

            if (!client.value) {
                return [];
            }

            return wrapChild(h(Suspense, {}, {
                default: () => h(AuthorizeForm, {
                    codeRequest: props.codeRequest!,
                    client: client.value!,
                    scopes: props.scopes,
                }),
                fallback: () => h(AuthorizeText, {
                    message: 'Loading...',
                }),
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
