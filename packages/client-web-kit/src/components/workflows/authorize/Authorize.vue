<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type {
    Client, ClientScope, OAuth2AuthorizationCodeRequest,
} from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import type { PropType, VNodeChild } from 'vue';
import {
    defineComponent, h,
} from 'vue';
import { injectStore } from '../../../core';
import Login from '../Login.vue';
import AuthorizeConfirm from './AuthorizeConfirm.vue';
import AuthorizeError from './AuthorizeError.vue';

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
        codeRequest: {
            type: Object as PropType<OAuth2AuthorizationCodeRequest>,
        },
        client: {
            type: Object as PropType<Client>,
        },
        clientScopes: {
            type: Array as PropType<ClientScope[]>,
            default: () => [],
        },
        error: {
            type: Object as PropType<Error>,
        },
    },
    emits: ['redirect'],
    setup(props) {
        const store = injectStore();
        const { loggedIn } = storeToRefs(store);

        return () => {
            if (props.error) {
                return wrapChild(h(AuthorizeError, {
                    message: props.error.message,
                }));
            }

            if (!props.codeRequest) {
                return [];
            }

            if (!loggedIn.value) {
                return wrapChild(h(Login, {
                    codeRequest: props.codeRequest,
                }));
            }

            if (!props.client) {
                return [];
            }

            return wrapChild(h(AuthorizeConfirm, {
                codeRequest: props.codeRequest,
                client: props.client,
                clientScopes: props.clientScopes,
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
