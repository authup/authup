<!--
  - Copyright (c) 2021-2022.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">

import { injectHTTPClient, useStore } from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { computed, defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    setup() {
        const store = useStore();
        const { loggedIn, accessTokenExpireDate: tokenExpireDate, realmManagement } = storeToRefs(store);

        const tokenExpiresIn = computed(() => {
            if (!tokenExpireDate.value) {
                return 0;
            }

            return tokenExpireDate.value.getTime() - Date.now();
        });

        const api = injectHTTPClient();
        const docsUrl = computed(() => {
            return new URL('docs/', api.getBaseURL()).href;
        });

        return {
            loggedIn,
            tokenExpiresIn,
            docsUrl,
            realmManagement,
        };
    },
});
</script>
<template>
    <div>
        <div class="page-sidebar">
            <div
                v-if="realmManagement"
                class="sidebar-header"
            >
                <div class="text-center">
                    {{ realmManagement.name }}
                </div>
            </div>

            <VCNavItems
                class="sidebar-menu navbar-nav"
                :tier="1"
            />

            <div class="mt-auto">
                <div
                    v-if="loggedIn"
                    class="font-weight-light d-flex flex-column ms-3 me-3 mb-1 mt-auto"
                >
                    <small>
                        <VCCountdown :time="tokenExpiresIn">
                            <template #default="props">
                                <i class="fa fa-clock pr-1" /> The session expires in
                                <span class="text-success">{{ props.minutes }} minute(s), {{ props.seconds }} second(s)</span>.
                            </template>
                        </VCCountdown>
                    </small>
                </div>

                <ul class="sidebar-menu nav-items navbar-nav">
                    <li class="nav-item">
                        <a
                            class="nav-link"
                            :href="docsUrl"
                            target="_blank"
                        >
                            <i class="fa fa-file" /> <span class="nav-link-text">API Docs</span>
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>
