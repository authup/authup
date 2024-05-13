<!--
  - Copyright (c) 2021-2022.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { LanguageSwitcherDropdown, useStore } from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { defineNuxtComponent, ref } from '#imports';

export default defineNuxtComponent({
    components: {
        LanguageSwitcherDropdown,
    },
    setup() {
        const store = useStore();
        const { loggedIn, user } = storeToRefs(store);

        const displayNav = ref(false);

        const toggleNav = () => {
            displayNav.value = !displayNav.value;
        };

        return {
            loggedIn,
            user,
            toggleNav,
            displayNav,
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
                        <span class="sr-only">Toggle navigation</span>
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
                    class="navbar-content navbar-collapse collapse"
                    :class="{'show': displayNav}"
                >
                    <VCNavItems
                        class="navbar-nav"
                        :tier="0"
                    />

                    <ul class="navbar-nav nav-items navbar-gadgets">
                        <li class="nav-item">
                            <LanguageSwitcherDropdown link-class-extra="nav-link" />
                        </li>
                        <template v-if="loggedIn && user">
                            <li class="nav-item">
                                <a
                                    href="javascript:void(0)"
                                    class="nav-link"
                                >
                                    <span>{{ user.display_name ? user.display_name : user.name }}</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <NuxtLink
                                    :to="'/settings'"
                                    class="nav-link"
                                >
                                    <i class="fa fa-cog" />
                                </NuxtLink>
                            </li>
                            <li class="nav-item">
                                <NuxtLink
                                    :to="'/logout'"
                                    class="nav-link"
                                >
                                    <i class="fa fa-power-off" />
                                </NuxtLink>
                            </li>
                        </template>
                    </ul>
                </div>
            </nav>
        </header>
    </div>
</template>
