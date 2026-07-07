<script lang="ts">
import { TranslatorTranslationAppKey, TranslatorTranslationEntityKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { useTranslations, useTranslationsForNamespace } from '@authup/client-web-kit';
import { VCIcon } from '@vuecs/icon';
import { computed, defineComponent } from 'vue';
import { definePageMeta } from '#imports';
import AccountSVG from '../../components/svg/AccountSVG';
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    components: { AccountSVG, VCIcon },
    setup() {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.ACCOUNT },
                { key: TranslatorTranslationAppKey.SECURITY },
                { key: TranslatorTranslationAppKey.SETTINGS },
                { key: TranslatorTranslationAppKey.MANAGEMENT },
            ],
        );

        const translationsEntity = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.SESSION,
                count: 2,
            },
        ]);

        const items = computed(() => [
            {
                name: translationsApp.account,
                icon: 'fa6-solid:bars',
                url: '/settings',
            },
            {
                name: translationsApp.security,
                icon: 'fa6-solid:lock',
                url: '/settings/security',
            },
            {
                name: translationsEntity.session,
                icon: 'fa6-solid:desktop',
                url: '/settings/sessions',
            },
        ]);

        return { items, translationsApp };
    },
});
</script>
<template>
    <div>
        <div class="text-center">
            <AccountSVG />
        </div>
        <h1 class="title no-border mb-3">
            <VCIcon name="fa6-solid:gear" />
            {{ translationsApp.settings }}
            <span class="sub-title ms-1">
                {{ translationsApp.management }}
            </span>
        </h1>
        <div class="content-wrapper">
            <div class="content-sidebar flex-col">
                <VCNavItems
                    :data="items"
                    variant="pills"
                    orientation="vertical"
                />
            </div>
            <div class="content-container">
                <NuxtPage />
            </div>
        </div>
    </div>
</template>
