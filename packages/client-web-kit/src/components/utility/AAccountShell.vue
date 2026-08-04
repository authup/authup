<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { TranslatorTranslationAppKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    ref,
    watchEffect,
} from 'vue';
import { useTranslations, useTranslator } from '../../core';
import type { AAccountShellNavItem } from './types';

// The account console's content chrome: brand + nav tabs + content card.
// Identity/session controls (user chip, sign-out) deliberately do NOT live
// here — they join the host's single top-right gadget cluster (AAuthApp's
// `gadgets` slot), so the page carries ONE top bar.
export default defineComponent({
    components: {
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
        // Absolute URL of the application the visitor came from. The host
        // is responsible for validating it (server-core does so against
        // the trusted app origins); the shell only renders it.
        backLink: { type: String },
    },
    setup(props) {
        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.ACCOUNT,
            },
        ]);

        const translate = useTranslator();

        // Label the link with the target host rather than the full URL:
        // shorter, and it is the part that identifies the application.
        const backHost = computed(() => {
            if (!props.backLink) {
                return undefined;
            }

            try {
                return new URL(props.backLink).host;
            } catch {
                return undefined;
            }
        });

        const backLabel = ref<string>('');
        watchEffect(async () => {
            const host = backHost.value;
            if (!host) {
                backLabel.value = '';
                return;
            }

            backLabel.value = await translate({
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.BACK_TO_APP,
                data: { host },
            });
        });

        return {
            translations,
            backHost,
            backLabel,
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
            <a
                v-if="backHost"
                :href="backLink"
                class="a-account-shell-back"
            >
                <VCIcon name="fa6-solid:chevron-left" />
                {{ backLabel }}
            </a>
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
                :aria-current="item.active ? 'page' : undefined"
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
