<!--
  - Copyright (c) 2021-2022.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">

import { injectHTTPClient, injectStore } from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { computed, defineNuxtComponent } from '#imports';

export default defineNuxtComponent({
    setup() {
        const store = injectStore();
        const {
            loggedIn, 
            accessTokenExpireDate: tokenExpireDate, 
            realmManagement, 
        } = storeToRefs(store);

        const tokenExpiresIn = computed(() => {
            if (!tokenExpireDate.value) {
                return 0;
            }

            return tokenExpireDate.value.getTime() - Date.now();
        });

        const api = injectHTTPClient();
        const docsUrl = computed(() => new URL('docs/', api.getBaseURL()).href);

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

            <!--
                Use Bootstrap's `.nav .flex-col` instead of
                `.navbar-nav`: navbar-nav zeroes
                `--bs-nav-link-padding-x` (correct for the header bar,
                wrong for a sidebar). Bare `.nav` provides the CSS-var
                scope `.nav-link` reads its padding from
                (`--bs-nav-link-padding-x: 1rem; --bs-nav-link-padding-y:
                0.5rem;`); `.flex-col` keeps the layout vertical
                (`.nav` alone is `display: flex; flex-wrap: wrap;`, which
                would lay items out horizontally).
            -->
            <VCNavItems
                class="sidebar-menu nav flex-col"
                :level="1"
            />

            <div class="mt-auto">
                <div
                    v-if="loggedIn"
                    class="session-info font-weight-light flex-col ms-3 me-3 mb-1 mt-auto"
                >
                    <small>
                        <VCCountdown :time="tokenExpiresIn">
                            <template #default="props">
                                <i class="fa fa-clock pe-1" /> The session will be renewed in
                                <span class="text-success-600">{{ props.minutes }} minute(s), {{ props.seconds }} second(s)</span>.
                            </template>
                        </VCCountdown>
                    </small>
                </div>

                <ul class="sidebar-menu vc-nav-items nav flex-col">
                    <li class="vc-nav-item">
                        <a
                            class="vc-nav-link nav-link"
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
<style scoped>
.session-info {
    display: flex;
}

@media (max-width: 768px) {
    .session-info {
        display: none;
    }
}
</style>
