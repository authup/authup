<!--
  - Copyright (c) 2021-2022.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">

import {
    TranslatorTranslationAppKey,
    TranslatorTranslationNamespace,
    injectHTTPClient,
    injectStore,
    injectTranslatorLocale,
    useTranslationsForNamespace,
    useTranslator,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { computed, defineNuxtComponent } from '#imports';
import { Navigation } from '../config/layout';

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

        const translate = useTranslator();
        const locale = injectTranslatorLocale();

        // The sidebar resolver filters items against the live session via
        // an `await`ed permission check. The reactive reads happen AFTER
        // that await, so `<VCNavItems>` can't auto-track them — the
        // explicit `:watch` list re-runs the resolver on every session
        // transition (login/logout, identity change, realm switch) plus
        // locale changes (so the labels re-translate on language switch).
        const navigation = new Navigation(store, translate);
        const sideItems = () => navigation.getSideItems();
        const sideItemsWatch = [
            () => store.loggedIn,
            () => store.userId,
            () => store.realmManagement,
            () => locale.value,
        ];

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.SESSION_RENEW },
                { key: TranslatorTranslationAppKey.MINUTES },
                { key: TranslatorTranslationAppKey.SECONDS },
                { key: TranslatorTranslationAppKey.API_DOCS },
            ],
        );

        return {
            loggedIn,
            tokenExpiresIn,
            docsUrl,
            realmManagement,
            sideItems,
            sideItemsWatch,
            translationsApp,
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
                :data="sideItems"
                :watch="sideItemsWatch"
            />

            <div class="mt-auto">
                <div
                    v-if="loggedIn"
                    class="session-info font-weight-light flex-col ms-3 me-3 mb-1 mt-auto"
                >
                    <small>
                        <VCCountdown :time="tokenExpiresIn">
                            <template #default="props">
                                <VCIcon
                                    name="fa6-solid:clock"
                                    class="pe-1"
                                /> {{ translationsApp.sessionRenew }}
                                <span class="text-success-600">
                                    {{ props.minutes }} {{ translationsApp.minutes }},
                                    {{ props.seconds }} {{ translationsApp.seconds }}
                                </span>.
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
                            <VCIcon name="fa6-solid:file" /> <span class="nav-link-text">{{ translationsApp.apiDocs }}</span>
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
