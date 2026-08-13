<script lang="ts">
import { defineQuery } from '@rapiq/core';
import type { IQuery } from '@rapiq/core';
import type { Session } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AEntityDelete,
    APagination,
    ASessions,
    injectStore,
    usePermissionCheck,
    useTranslation,
    useTranslations,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import type { TableColumn } from '@vuecs/table';
import type { FormOption } from '@vuecs/forms';
import { VCFormSelect } from '@vuecs/forms';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import { computed, ref } from 'vue';
import { defineNuxtComponent } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey } from '../../../config/layout';

export default defineNuxtComponent({
    components: {
        AEntityDelete,
        APagination,
        ASessions,
        VCButton,
        VCFormSelect,
        VCIcon,
        VCLink,
    },
    emits: ['failed'],
    setup(_props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.SESSION_READ,
            ],
        });

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        const store = injectStore();
        const { realmManagementId, sessionId } = storeToRefs(store);

        const query = computed(() => defineQuery<Session>({
            filters: { realmId: realmManagementId.value ?? null },
            relations: ['user', 'client'],
            sorts: { seenAt: 'DESC' },
        }));

        const hasDropPermission = usePermissionCheck({ name: PermissionName.SESSION_DELETE });
        const hasUserReadPermission = usePermissionCheck({ name: PermissionName.USER_READ });
        const hasClientReadPermission = usePermissionCheck({ name: PermissionName.CLIENT_READ });

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.SUBJECT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.AUTH_METHOD },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.IP_ADDRESS },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.USER_AGENT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.SEEN_AT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.EXPIRES_AT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.MFA_AT },
            { namespace: TranslatorTranslationNamespace.COMMON, key: TranslatorTranslationCommonKey.ALL },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_CURRENT },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.DETAILS },
        ]);

        const translationUser = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.USER,
            count: 2,
        });
        const translationClient = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.CLIENT,
            count: 2,
        });

        const subjectKind = ref('all');
        const subjectKindOptions = computed<FormOption[]>(() => [
            { value: 'all', label: translations.all },
            { value: 'user', label: translationUser.value },
            { value: 'client', label: translationClient.value },
        ]);

        const applySubjectKind = (load: (input: IQuery) => Promise<unknown>) => {
            if (subjectKind.value === 'all') {
                return load(defineQuery<Session>({ filters: {} }));
            }

            return load(defineQuery<Session>({ filters: { subKind: subjectKind.value } }));
        };

        const columns = computed<TableColumn<Session>[]>(() => [
            {
                key: 'subject',
                label: translations.subject,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'authMethod',
                label: translations.authMethod,
                headerClass: 'text-center',
                cellClass: 'text-center',
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
                key: 'seenAt',
                label: translations.seenAt,
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
                key: 'options',
                label: '',
                cellClass: 'text-center',
            },
        ]);

        return {
            query,
            columns,
            handleFailed,
            hasDropPermission,
            hasUserReadPermission,
            hasClientReadPermission,
            translations,
            sessionId,
            subjectKind,
            subjectKindOptions,
            applySubjectKind,
            VCLink,
        };
    },
});
</script>
<template>
    <ASessions
        :query="query"
        :body="{ tag: 'div' }"
        :footer="true"
        @failed="handleFailed"
    >
        <template #header="props">
            <div class="flex justify-end mb-2">
                <VCFormSelect
                    v-model="subjectKind"
                    :options="subjectKindOptions"
                    :aria-label="translations.subject"
                    @update:model-value="applySubjectKind(props.load)"
                />
            </div>
        </template>
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
                :columns="columns"
                :busy="props.busy"
            >
                <template #cell-subject="{ row }">
                    <VCIcon
                        :name="row.subKind === 'client' ? 'fa6-solid:cube' : 'fa6-solid:user'"
                        class="me-1 text-fg-muted"
                    />
                    <template v-if="row.userId">
                        <VCLink
                            v-if="hasUserReadPermission"
                            :to="`/users/${row.userId}`"
                        >
                            {{ row.user?.name ?? row.sub }}
                        </VCLink>
                        <span
                            v-else
                            class="break-all"
                        >{{ row.user?.name ?? row.sub }}</span>
                    </template>
                    <template v-else-if="row.clientId">
                        <VCLink
                            v-if="hasClientReadPermission"
                            :to="`/clients/${row.clientId}`"
                        >
                            {{ row.client?.name ?? row.sub }}
                        </VCLink>
                        <span
                            v-else
                            class="break-all"
                        >{{ row.client?.name ?? row.sub }}</span>
                    </template>
                    <span
                        v-else
                        class="font-mono"
                    >{{ row.sub }}</span>
                </template>
                <template #cell-authMethod="{ row }">
                    <span
                        v-if="row.authMethod"
                        class="font-mono"
                    >{{ row.authMethod }}</span>
                    <span v-else>&ndash;</span>
                    <VCIcon
                        v-if="row.mfaAt"
                        name="fa6-solid:shield-halved"
                        class="ms-1 text-success-600"
                        :title="translations.mfaAt"
                    />
                </template>
                <template #cell-userAgent="{ row }">
                    <span :title="row.userAgent">{{ row.userAgent }}</span>
                </template>
                <template #cell-seenAt="{ row }">
                    <VCTimeago
                        v-if="row.seenAt"
                        :datetime="row.seenAt"
                    />
                    <span v-else>&ndash;</span>
                </template>
                <template #cell-expiresAt="{ row }">
                    <VCTimeago :datetime="row.expiresAt" />
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        :as="VCLink"
                        :to="`/sessions/${row.id}`"
                        :aria-label="translations.details"
                        :title="translations.details"
                        size="sm"
                        color="primary"
                        variant="outline"
                    >
                        <template #leading>
                            <VCIcon name="fa6-solid:bars" />
                        </template>
                    </VCButton>
                    <span
                        v-if="row.id === sessionId"
                        class="ms-2 inline-flex items-center rounded-full bg-primary-600/10 px-2 py-0.5 text-xs font-medium text-primary-600"
                    >
                        {{ translations.sessionCurrent }}
                    </span>
                    <AEntityDelete
                        v-else
                        :entity-id="row.id"
                        entity-type="session"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        class="ms-2"
                        @deleted="props.deleted"
                        @failed="handleFailed"
                    />
                </template>
            </VCTable>
        </template>
    </ASessions>
</template>
