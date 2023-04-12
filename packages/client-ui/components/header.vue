<!--
  - Copyright (c) 2021-2022.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { NavigationComponents } from '@vue-layout/navigation';
import { storeToRefs } from 'pinia';
import { ref } from '#imports';
import { defineNuxtComponent } from '#app';
import { useAuthStore } from '../store/auth';

export default defineNuxtComponent({
    components: {
        NavigationComponents,
    },
    setup() {
        const store = useAuthStore();
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
                    <navigation-components
                        class="navbar-nav"
                        :tier="0"
                    />

                    <ul
                        v-if="loggedIn && user"
                        class="navbar-nav nav-items navbar-gadgets"
                    >
                        <li class="nav-item">
                            <a
                                href="javascript:void(0)"
                                class="nav-link"
                            >
                                <span>{{ user.displayName ? user.displayName : user.name }}</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <nuxt-link
                                :to="'/settings'"
                                class="nav-link"
                            >
                                <i class="fa fa-cog" />
                            </nuxt-link>
                        </li>
                        <li class="nav-item">
                            <nuxt-link
                                :to="'/logout'"
                                class="nav-link"
                            >
                                <i class="fa fa-power-off" />
                            </nuxt-link>
                        </li>
                    </ul>
                </div>
            </nav>
        </header>
    </div>
</template>
