<!--
  Copyright (c) 2021-2021.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { getComponents } from '@vue-layout/navigation';
import { defineNuxtComponent } from '#app';
import { useAuthStore } from '../store/auth';

export default defineNuxtComponent({
    setup() {
        const { loggedIn, user } = useAuthStore();

        return {
            loggedIn,
            user,
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
                    >
                        <span class="sr-only">Toggle navigation</span>
                        <span class="icon-bar" />
                        <span class="icon-bar" />
                        <span class="icon-bar" />
                    </button>
                </div>
                <div class="logo">
                    Authelion
                </div>
            </div>

            <nav class="page-navbar navbar-expand-md">
                <div
                    id="page-navbar"
                    class="navbar-content navbar-collapse"
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
                            <nuxt-link
                                class="nav-link user-link"
                                :to="'/users/'+user.id"
                            >
                                <span>{{ user.displayName ? user.displayName : user.name }}</span>
                            </nuxt-link>
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
