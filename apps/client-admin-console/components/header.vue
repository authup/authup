<!--
  - Copyright (c) 2021-2022.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { TranslatorTranslationAppKey, TranslatorTranslationNamespace } from '@authup/i18n';
import {
    AColorModeSwitcher,
    ALanguageSwitcherDropdown,
    StoreAuthStatus,
    injectStore,
    useTranslationsForNamespace,
} from '@authup/client-web-kit';
import { VCIcon } from '@vuecs/icon';
import { storeToRefs } from 'pinia';
import {
    computed,
    defineNuxtComponent,
    ref,
    useColorMode,
} from '#imports';
import { LayoutTopNavigation } from '../config/layout';
import LogoSVG from './svg/LogoSVG';

export default defineNuxtComponent({
    components: {
        AColorModeSwitcher,
        ALanguageSwitcherDropdown,
        LogoSVG,
        VCIcon,
    },
    setup() {
        const store = injectStore();
        const {
            status,
            user,
        } = storeToRefs(store);

        const authenticated = computed(() => status.value === StoreAuthStatus.AUTHENTICATED);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.GENERAL },
                { key: TranslatorTranslationAppKey.TOGGLE_NAVIGATION },
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
        // writing `isDark` (via the switcher's v-model) flips both
        // server-side (SSR-safe via cookie) and client-side.
        const { isDark } = useColorMode();

        return {
            authenticated,
            user,
            topItems,
            toggleNav,
            displayNav,
            isDark,
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
                    <LogoSVG
                        :width="32"
                        :height="32"
                    />
                    <div class="logo-text">
                        <span>A</span>u<span>t</span>h<span>u</span>p
                    </div>
                </div>
            </div>

            <!--
                Inlined from the retired Bootstrap-compat `.navbar*` layer:
                `navbar-expand-md` → md:flex-nowrap md:justify-start;
                `navbar-collapse` → grow basis-full items-center, hidden on
                mobile unless toggled, md:flex! to force-show at md+ (the `!`
                beats theme-tailwind's flex-col on the VCNavItems root, same
                reason `md:flex-row!` is needed below). `navbar-content`,
                `vc-nav-items`, `navbar-gadgets` stay — they're app selectors.
            -->
            <nav class="page-navbar md:flex-nowrap md:justify-start">
                <div
                    id="page-navbar"
                    class="navbar-content grow basis-full items-center md:flex!"
                    :class="{ hidden: !displayNav }"
                >
                    <VCNavItems
                        class="flex flex-col list-none md:flex-row!"
                        :data="topItems"
                    />

                    <ul class="flex flex-col list-none md:flex-row! vc-nav-items navbar-gadgets">
                        <li class="vc-nav-item">
                            <AColorModeSwitcher
                                v-model:dark="isDark"
                                class="vc-nav-link"
                            />
                        </li>
                        <li class="vc-nav-item">
                            <ALanguageSwitcherDropdown link-class-extra="vc-nav-link" />
                        </li>
                        <template v-if="authenticated && user">
                            <li class="vc-nav-item">
                                <a
                                    href="javascript:void(0)"
                                    class="vc-nav-link"
                                >
                                    <span>{{ user.displayName ? user.displayName : user.name }}</span>
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
