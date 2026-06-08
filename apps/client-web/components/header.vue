<!--
  - Copyright (c) 2021-2022.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import {
    LanguageSwitcherDropdown,
    TranslatorTranslationAppKey,
    TranslatorTranslationNamespace,
    injectStore,
    useTranslationsForNamespace,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { 
    computed, 
    defineNuxtComponent, 
    ref, 
    useColorMode, 
} from '#imports';
import { LayoutTopNavigation } from '../config/layout';

export default defineNuxtComponent({
    components: { LanguageSwitcherDropdown },
    setup() {
        const store = injectStore();
        const {
            loggedIn,
            user,
        } = storeToRefs(store);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.GENERAL },
                { key: TranslatorTranslationAppKey.TOGGLE_NAVIGATION },
                { key: TranslatorTranslationAppKey.SWITCH_TO_LIGHT_MODE },
                { key: TranslatorTranslationAppKey.SWITCH_TO_DARK_MODE },
            ],
        );

        // Top nav is a single un-gated entry — pass it as a static
        // array straight to `<VCNavItems :data>` (no permission filter,
        // no resolver, no registry). The label is re-derived from the
        // catalog so it follows the active locale.
        const topItems = computed(() => LayoutTopNavigation.map((item) => ({
            ...item,
            name: translationsApp.general,
        })));

        const displayNav = ref(false);
        const toggleNav = () => {
            displayNav.value = !displayNav.value;
        };

        // `useColorMode()` is auto-imported by @vuecs/nuxt. The
        // composable returns a { mode, isDark } pair backed by the
        // `vc-color-mode` cookie + `.dark` / `.light` class on <html>;
        // toggling `isDark` flips both server-side (SSR-safe via cookie)
        // and client-side (immediate class swap).
        const { isDark } = useColorMode();
        const toggleColorMode = () => {
            isDark.value = !isDark.value;
        };

        return {
            loggedIn,
            user,
            topItems,
            toggleNav,
            displayNav,
            isDark,
            toggleColorMode,
            translationsApp,
        };
    },
});
</script>
<template>
    <div>
        <header class="page-header fixed-top">
            <div class="header-title">
                <div class="toggle-box">
                    <button
                        type="button"
                        class="toggle-trigger"
                        @click="toggleNav"
                    >
                        <span class="sr-only">{{ translationsApp.toggleNavigation }}</span>
                        <span class="icon-bar" />
                        <span class="icon-bar" />
                        <span class="icon-bar" />
                    </button>
                </div>
                <div class="logo">
                    Authup
                </div>
            </div>

            <nav class="page-navbar navbar-expand-md">
                <div
                    id="page-navbar"
                    class="navbar-content navbar-collapse"
                    :class="{'show': displayNav}"
                >
                    <VCNavItems
                        class="navbar-nav"
                        :data="topItems"
                    />

                    <ul class="navbar-nav vc-nav-items navbar-gadgets">
                        <li class="vc-nav-item">
                            <button
                                type="button"
                                class="vc-nav-link"
                                :aria-label="isDark ? translationsApp.switchToLightMode : translationsApp.switchToDarkMode"
                                :aria-pressed="isDark ? 'true' : 'false'"
                                @click.prevent="toggleColorMode"
                            >
                                <VCIcon :name="isDark ? 'fa6-solid:sun' : 'fa6-solid:moon'" />
                            </button>
                        </li>
                        <li class="vc-nav-item">
                            <LanguageSwitcherDropdown link-class-extra="vc-nav-link" />
                        </li>
                        <template v-if="loggedIn && user">
                            <li class="vc-nav-item">
                                <a
                                    href="javascript:void(0)"
                                    class="vc-nav-link"
                                >
                                    <span>{{ user.display_name ? user.display_name : user.name }}</span>
                                </a>
                            </li>
                            <li class="vc-nav-item">
                                <NuxtLink
                                    :to="'/settings'"
                                    class="vc-nav-link"
                                >
                                    <VCIcon name="fa6-solid:gear" />
                                </NuxtLink>
                            </li>
                            <li class="vc-nav-item">
                                <NuxtLink
                                    :to="'/logout'"
                                    class="vc-nav-link"
                                >
                                    <VCIcon name="fa6-solid:power-off" />
                                </NuxtLink>
                            </li>
                        </template>
                    </ul>
                </div>
            </nav>
        </header>
    </div>
</template>
