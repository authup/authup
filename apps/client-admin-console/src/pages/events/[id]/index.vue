<script lang="ts">

import type { Event as EventEntity } from '@authup/core-kit';
import {
    TranslatorTranslationCommonKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    injectHTTPClient,
    useTranslation,
    useTranslations,
} from '@authup/client-web-kit';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import { VCBreadcrumb } from '@vuecs/navigation';
import type { Ref } from 'vue';
import { computed, defineComponent, ref } from 'vue';
import { buildRecordHeading } from '../../../composables/record';
import { LayoutSection } from '../../../config/layout';
import { useRoute, useRouter } from 'vue-router';
import { buildEntityBreadcrumb, useSectionBreadcrumb } from '../../../composables/breadcrumb';

export default defineComponent({
    components: {
        VCBreadcrumb,
        VCIcon,
        VCLink,
    },
    async setup() {
        const route = useRoute();
        const router = useRouter();

        // Resolves through inject(), so it has to run before the record fetch
        // below is awaited.
        const breadcrumbBase = useSectionBreadcrumb(LayoutSection.EVENTS);

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


        const translationSession = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.SESSION,
            count: 1,
        });

        const httpClient = injectHTTPClient();

        // A record that cannot be loaded sends the visitor back to the
        // collection; the template renders nothing until then (`v-if`).
        let entity : Ref<EventEntity | null> = ref(null);
        try {
            entity = ref(await httpClient
                .event
                .getOne(route.params.id as string)
                .then((response) => response.data));
        } catch {
            await router.replace({ path: '/events' });
        }

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/events',
            },
        ]);

        const heading = computed(() => buildRecordHeading(entity.value ?? {}));

        const breadcrumbItems = computed(() => buildEntityBreadcrumb({
            base: breadcrumbBase.value,
            entity: {
                label: heading.value.label,
                url: `/events/${entity.value?.id}`,
            },
            path: route.path,
            tabs: items.value,
        }));

        const dataFormatted = computed(() => {
            if (!entity.value?.data) {
                return null;
            }

            return JSON.stringify(entity.value.data, null, 2);
        });

        return {
            heading,
            breadcrumbItems,
            entity,
            items,
            dataFormatted,
            translations,
            translationSession,
        };
    },
});
</script>
<template>
    <div v-if="entity">
        <VCBreadcrumb
            :items="breadcrumbItems"
            class="mb-2"
        />
        <div class="mb-3">
            <h1 class="title no-border mb-0">
                <VCIcon
                    name="fa6-solid:clipboard-list"
                    class="me-1"
                /> {{ heading.label }}
            </h1>
            <p
                v-if="heading.subTitle"
                class="sub-title"
            >
                {{ heading.subTitle }}
            </p>
        </div>
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
                    <span class="text-right break-all">{{ entity.refType ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.ref }} ({{ translations.id }})</span>
                    <span class="text-right break-all font-mono">{{ entity.refId ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.createdAt }}</span>
                    <span class="text-right"><VCTimeago :datetime="entity.createdAt" /></span>
                </div>
                <div class="flex justify-between gap-2 py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.expiresAt }}</span>
                    <span
                        v-if="entity.expiring && entity.expiresAt"
                        class="text-right"
                    ><VCTimeago :datetime="entity.expiresAt" /></span>
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
                    <span class="text-right break-all">{{ entity.actorType ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.id }}</span>
                    <span class="text-right break-all font-mono">{{ entity.actorId ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.name }}</span>
                    <span class="text-right break-all">{{ entity.actorName ?? '–' }}</span>
                </div>
            </div>
            <div class="w-full md:w-1/3 px-2 mb-3">
                <h6 class="title">
                    {{ translations.request }}
                </h6>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.path }}</span>
                    <span class="text-right break-all font-mono">{{ entity.requestPath ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.method }}</span>
                    <span class="text-right break-all">{{ entity.requestMethod ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.ipAddress }}</span>
                    <span class="text-right break-all">{{ entity.requestIpAddress ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translationSession }}</span>
                    <VCLink
                        v-if="entity.sessionId"
                        :to="'/sessions/' + entity.sessionId"
                        class="text-right break-all font-mono"
                    >
                        {{ entity.sessionId }}
                    </VCLink>
                    <span
                        v-else
                        class="text-right"
                    >&ndash;</span>
                </div>
                <div class="flex justify-between gap-2 py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.userAgent }}</span>
                    <span class="text-right break-all">{{ entity.requestUserAgent ?? '–' }}</span>
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
