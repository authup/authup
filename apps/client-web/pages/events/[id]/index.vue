<script lang="ts">

import type { Event as EventEntity } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    injectHTTPClient,
    useTranslations,
    useTranslationsForNamespace,
} from '@authup/client-web-kit';
import { VCIcon } from '@vuecs/icon';
import { computed, defineComponent, ref } from 'vue';
import { definePageMeta } from '#imports';
import { createError, navigateTo, useRoute } from '#app';
import { LayoutKey } from '../../../config/layout';

export default defineComponent({
    components: { VCIcon },
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.EVENT_READ,
            ],
        });

        const route = useRoute();

        const entity = ref<EventEntity>(null!);

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.GENERAL,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.REQUEST,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.DATA,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.SCOPE,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.REF,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.ACTOR,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.TYPE,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.ID,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PATH,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.METHOD,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.IP_ADDRESS,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.USER_AGENT,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CREATED_AT,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.EXPIRES_AT,
            },
        ]);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.DETAILS },
            ],
        );

        try {
            entity.value = await injectHTTPClient()
                .event
                .getOne(route.params.id as string);
        } catch {
            await navigateTo({ path: '/events' });
            throw createError({});
        }

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/events',
            },
        ]);

        const dataFormatted = computed(() => {
            if (!entity.value.data) {
                return null;
            }

            return JSON.stringify(entity.value.data, null, 2);
        });

        return {
            entity,
            items,
            dataFormatted,
            translations,
            translationsApp,
        };
    },
});
</script>
<template>
    <div>
        <h1 class="title no-border mb-3">
            <VCIcon
                name="fa6-solid:clipboard-list"
                class="me-1"
            /> {{ entity.name }}
            <span class="sub-title ms-1">{{ translationsApp.details }}</span>
        </h1>
        <div class="mb-2">
            <VCNavItems
                :data="items"
                variant="pills"
            />
        </div>
        <div class="flex flex-wrap -mx-2">
            <div class="w-full md:w-1/3 px-2 mb-3">
                <h6 class="title">
                    {{ translations.general }}
                </h6>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.scope }}</span>
                    <span class="text-right break-all">{{ entity.scope }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.name }}</span>
                    <span class="text-right break-all">{{ entity.name }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.ref }} ({{ translations.type }})</span>
                    <span class="text-right break-all">{{ entity.ref_type ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.ref }} ({{ translations.id }})</span>
                    <span class="text-right break-all font-mono">{{ entity.ref_id ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.createdAt }}</span>
                    <span class="text-right"><VCTimeago :datetime="entity.created_at" /></span>
                </div>
                <div class="flex justify-between gap-2 py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.expiresAt }}</span>
                    <span
                        v-if="entity.expiring && entity.expires_at"
                        class="text-right"
                    ><VCTimeago :datetime="entity.expires_at" /></span>
                    <span
                        v-else
                        class="text-right"
                    >&ndash;</span>
                </div>
            </div>
            <div class="w-full md:w-1/3 px-2 mb-3">
                <h6 class="title">
                    {{ translations.actor }}
                </h6>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.type }}</span>
                    <span class="text-right break-all">{{ entity.actor_type ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.id }}</span>
                    <span class="text-right break-all font-mono">{{ entity.actor_id ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.name }}</span>
                    <span class="text-right break-all">{{ entity.actor_name ?? '–' }}</span>
                </div>
            </div>
            <div class="w-full md:w-1/3 px-2 mb-3">
                <h6 class="title">
                    {{ translations.request }}
                </h6>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.path }}</span>
                    <span class="text-right break-all font-mono">{{ entity.request_path ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.method }}</span>
                    <span class="text-right break-all">{{ entity.request_method ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.ipAddress }}</span>
                    <span class="text-right break-all">{{ entity.request_ip_address ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.userAgent }}</span>
                    <span class="text-right break-all">{{ entity.request_user_agent ?? '–' }}</span>
                </div>
            </div>
        </div>
        <div v-if="dataFormatted">
            <h6 class="title">
                {{ translations.data }}
            </h6>
            <pre class="text-xs bg-bg-muted rounded p-3 overflow-x-auto">{{ dataFormatted }}</pre>
        </div>
    </div>
</template>
