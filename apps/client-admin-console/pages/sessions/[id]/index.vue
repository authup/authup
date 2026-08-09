<script lang="ts">

import type { Session, SessionToken } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { defineQuery } from '@rapiq/core';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AEntityDelete,
    APagination,
    ASessionTokens,
    injectHTTPClient,
    injectStore,
    usePermissionCheck,
    useTranslation,
    useTranslations,
    useTranslationsForNamespace,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import type { TableColumn } from '@vuecs/table';
import { VCIcon } from '@vuecs/icon';
import type { Ref } from 'vue';
import { computed, defineComponent } from 'vue';
import { definePageMeta } from '#imports';
import {
    createError,
    navigateTo,
    useAsyncData,
    useRoute,
} from '#app';
import { LayoutKey } from '../../../config/layout';

export default defineComponent({
    components: {
        AEntityDelete,
        APagination,
        ASessionTokens,
        VCIcon,
    },
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.SESSION_READ,
            ],
        });

        const route = useRoute();
        const httpClient = injectHTTPClient();

        const store = injectStore();
        const { sessionId } = storeToRefs(store);

        const hasDropPermission = usePermissionCheck({ name: PermissionName.SESSION_DELETE });

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.COMMON, key: TranslatorTranslationCommonKey.GENERAL },
            { namespace: TranslatorTranslationNamespace.COMMON, key: TranslatorTranslationCommonKey.APPLICATION },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.SUBJECT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.KIND },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.AUTH_METHOD },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.MFA_AT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.IP_ADDRESS },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.USER_AGENT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.CREATED_AT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.REFRESHED_AT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.SEEN_AT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.EXPIRES_AT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.STATUS },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.ID },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.BACK },
        ]);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.DETAILS },
                { key: TranslatorTranslationAppKey.SESSION_CURRENT },
                { key: TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_ACTIVE },
                { key: TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_CONSUMED },
                { key: TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_REVOKED },
                { key: TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_EXPIRED },
            ],
        );

        const translationTokens = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.SESSION_TOKEN,
            count: 2,
        });

        const { data, error } = await useAsyncData(
            `session:${route.params.id}`,
            async () => {
                const response = await httpClient.session.getOne(route.params.id as string);

                let subjectName: string | null = null;
                try {
                    if (response.data.userId) {
                        const userResponse = await httpClient.user.getOne(response.data.userId);
                        subjectName = userResponse.data.name;
                    } else if (response.data.clientId) {
                        const clientResponse = await httpClient.client.getOne(response.data.clientId);
                        subjectName = clientResponse.data.name;
                    }
                } catch {
                    // stripped by permissions or deleted subject: fall back to the sub uuid
                }

                return { session: response.data, subjectName };
            },
        );

        if (error.value || !data.value) {
            await navigateTo({ path: '/sessions' });
            throw createError({});
        }

        const resolved = data as Ref<{ session: Session, subjectName: string | null }>;
        const entity = computed(() => resolved.value.session);
        const subjectName = computed(() => resolved.value.subjectName);

        const tokensQuery = defineQuery<SessionToken>({
            filters: { sessionId: route.params.id as string },
            relations: ['client'],
            sort: { createdAt: 'DESC' },
        });

        const tokenStatus = (row: SessionToken) : string => {
            if (row.revokedAt) {
                return translationsApp.sessionTokenStatusRevoked;
            }
            if (row.consumedAt) {
                return translationsApp.sessionTokenStatusConsumed;
            }
            if (row.expiresAt && Date.parse(row.expiresAt) < Date.now()) {
                return translationsApp.sessionTokenStatusExpired;
            }

            return translationsApp.sessionTokenStatusActive;
        };

        const tokenColumns = computed<TableColumn<SessionToken>[]>(() => [
            {
                key: 'kind',
                label: translations.kind,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'client',
                label: translations.application,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'ipAddress',
                label: translations.ipAddress,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'userAgent',
                label: translations.userAgent,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'createdAt',
                label: translations.createdAt,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'expiresAt',
                label: translations.expiresAt,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'status',
                label: translations.status,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
        ]);

        const items = computed(() => [
            {
                name: translations.back,
                icon: 'fa6-solid:arrow-left',
                url: '/sessions',
            },
        ]);

        const handleDeleted = async () => {
            await navigateTo({ path: '/sessions' });
        };

        return {
            entity,
            subjectName,
            sessionId,
            hasDropPermission,
            items,
            tokensQuery,
            tokenColumns,
            tokenStatus,
            translations,
            translationsApp,
            translationTokens,
            handleDeleted,
        };
    },
});
</script>
<template>
    <div>
        <h1 class="title no-border mb-3">
            <VCIcon
                name="fa6-solid:desktop"
                class="me-1"
            /> {{ subjectName ?? entity.sub }}
            <span class="sub-title ms-1">{{ translationsApp.details }}</span>
        </h1>
        <div class="mb-2 flex items-center justify-between">
            <VCNavItems
                :data="items"
                variant="pills"
            />
            <span
                v-if="entity.id === sessionId"
                class="inline-flex items-center rounded-full bg-primary-600/10 px-2 py-0.5 text-xs font-medium text-primary-600"
            >
                {{ translationsApp.sessionCurrent }}
            </span>
            <AEntityDelete
                v-else
                :entity-id="entity.id"
                entity-type="session"
                :with-text="true"
                :disabled="!hasDropPermission"
                @deleted="handleDeleted"
            />
        </div>
        <div class="flex flex-wrap -mx-2">
            <div class="w-full md:w-1/3 px-2 mb-3">
                <h6 class="title">
                    {{ translations.general }}
                </h6>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.subject }}</span>
                    <span class="text-right break-all">{{ subjectName ?? entity.sub }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.kind }}</span>
                    <span class="text-right break-all">{{ entity.subKind }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.authMethod }}</span>
                    <span class="text-right break-all font-mono">{{ entity.authMethod ?? '–' }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.mfaAt }}</span>
                    <span
                        v-if="entity.mfaAt"
                        class="text-right"
                    ><VCTimeago :datetime="entity.mfaAt" /></span>
                    <span
                        v-else
                        class="text-right"
                    >&ndash;</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.ipAddress }}</span>
                    <span class="text-right break-all font-mono">{{ entity.ipAddress }}</span>
                </div>
                <div class="flex justify-between gap-2 py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.userAgent }}</span>
                    <span class="text-right break-all">{{ entity.userAgent }}</span>
                </div>
            </div>
            <div class="w-full md:w-1/3 px-2 mb-3">
                <h6 class="title">
                    {{ translationsApp.details }}
                </h6>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.id }}</span>
                    <span class="text-right break-all font-mono">{{ entity.id }}</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.createdAt }}</span>
                    <span class="text-right"><VCTimeago :datetime="entity.createdAt" /></span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.refreshedAt }}</span>
                    <span
                        v-if="entity.refreshedAt"
                        class="text-right"
                    ><VCTimeago :datetime="entity.refreshedAt" /></span>
                    <span
                        v-else
                        class="text-right"
                    >&ndash;</span>
                </div>
                <div class="flex justify-between gap-2 border-b border-border py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.seenAt }}</span>
                    <span
                        v-if="entity.seenAt"
                        class="text-right"
                    ><VCTimeago :datetime="entity.seenAt" /></span>
                    <span
                        v-else
                        class="text-right"
                    >&ndash;</span>
                </div>
                <div class="flex justify-between gap-2 py-1 text-sm">
                    <span class="text-fg-muted">{{ translations.expiresAt }}</span>
                    <span class="text-right"><VCTimeago :datetime="entity.expiresAt" /></span>
                </div>
            </div>
        </div>
        <h6 class="title">
            {{ translationTokens }}
        </h6>
        <ASessionTokens
            :query="tokensQuery"
            :body="{ tag: 'div' }"
            :footer="true"
        >
            <template #footer="props">
                <APagination
                    :busy="props.busy"
                    :meta="props.meta"
                    :load="props.load"
                />
            </template>
            <template #body="props">
                <VCTable
                    :data="props.data"
                    :columns="tokenColumns"
                    :busy="props.busy"
                >
                    <template #cell-kind="{ row }">
                        <span class="font-mono">{{ row.kind }}</span>
                    </template>
                    <template #cell-client="{ row }">
                        {{ row.client?.name ?? row.clientId ?? '–' }}
                    </template>
                    <template #cell-userAgent="{ row }">
                        <span :title="row.userAgent">{{ row.userAgent }}</span>
                    </template>
                    <template #cell-createdAt="{ row }">
                        <VCTimeago :datetime="row.createdAt" />
                    </template>
                    <template #cell-expiresAt="{ row }">
                        <VCTimeago
                            v-if="row.expiresAt"
                            :datetime="row.expiresAt"
                        />
                        <span v-else>&ndash;</span>
                    </template>
                    <template #cell-status="{ row }">
                        {{ tokenStatus(row) }}
                    </template>
                </VCTable>
            </template>
        </ASessionTokens>
    </div>
</template>
