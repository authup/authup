<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { OAuth2AuthorizationData } from '@authup/core-kit';
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
        state: {
            type: Object as PropType<OAuth2AuthorizationData>,
        },
        message: {
            type: String,
        },
    },
    emits: ['redirect'],
    setup(props) {
        const store = injectStore();
        const { loggedIn } = storeToRefs(store);

        return () => {
            if (props.message) {
                return wrapChild(h(AuthorizeError, {
                    message: props.message,
                }));
            }

            if (!props.state) {
                return [];
            }

            if (!loggedIn.value) {
                return wrapChild(h(Login, {
                    state: props.state.token,
                    clientId: props.state.client.id,
                    realmId: props.state.client.realm_id || undefined,
                    redirectUri: props.state.tokenPayload.redirect_uri,
                }));
            }

            return wrapChild(h(AuthorizeConfirm, {
                params: props.state.tokenPayload,
                client: props.state.client,
                clientScopes: props.state.clientScopes,
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
