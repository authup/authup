<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { TranslatorTranslationAppKey, TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import { storeToRefs } from 'pinia';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import { injectStore, useTranslations } from '../../core';
import type { AAccountShellNavItem } from './types';

export default defineComponent({
    components: {
        VCButton, 
        VCIcon, 
        VCLink, 
    },
    props: {
        // Nav tab entries; labels arrive pre-translated so the shell stays
        // agnostic of which pages a host assembles around it.
        items: {
            type: Array as PropType<AAccountShellNavItem[]>,
            default: () => [],
        },
    },
    emits: ['signOut'],
    setup() {
        const store = injectStore();
        const { user } = storeToRefs(store);

        const userName = computed(() => {
            if (!user.value) {
                return '';
            }

            return user.value.displayName || user.value.name;
        });

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.ACCOUNT,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.SIGN_OUT,
            },
        ]);

        return {
            translations,
            userName,
        };
    },
});
</script>
<template>
    <div class="a-account-shell">
        <div class="a-account-shell-header">
            <div class="a-account-shell-brand">
                <svg
                    viewBox="0 0 100 100"
                    width="32"
                    height="32"
                    aria-hidden="true"
                >
                    <rect
                        x="8"
                        y="8"
                        width="84"
                        height="84"
                        rx="16"
                        fill="var(--authup-auth-logo-background, #34353a)"
                    />
                    <circle
                        cx="50"
                        cy="42"
                        r="12"
                        fill="#fff"
                    />
                    <path
                        d="M 41 44 L 59 44 L 55 68 L 45 68 Z"
                        fill="#fff"
                    />
                </svg>
                <span class="a-account-shell-title">
                    {{ translations.account }}
                </span>
            </div>
            <div class="a-account-shell-user">
                <span
                    v-if="userName"
                    class="a-account-shell-user-chip"
                >
                    <VCIcon name="fa6-solid:circle-user" />
                    {{ userName }}
                </span>
                <VCButton
                    type="button"
                    size="sm"
                    variant="outline"
                    @click.prevent="$emit('signOut')"
                >
                    <template #leading>
                        <VCIcon name="fa6-solid:right-from-bracket" />
                    </template>
                    {{ translations.signOut }}
                </VCButton>
            </div>
        </div>
        <nav
            v-if="items.length > 0"
            class="a-account-shell-nav"
        >
            <VCLink
                v-for="item in items"
                :key="item.key"
                v-bind="item.link"
                class="a-account-shell-nav-link"
                :class="{ 'a-account-shell-nav-link--active': item.active }"
            >
                <VCIcon
                    v-if="item.icon"
                    :name="item.icon"
                />
                {{ item.label }}
            </VCLink>
        </nav>
        <div class="a-account-shell-body">
            <slot />
        </div>
    </div>
</template>
