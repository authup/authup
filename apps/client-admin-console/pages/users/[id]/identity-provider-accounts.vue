<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { defineQuery } from '@rapiq/core';
import type { IdentityProviderAccount, User } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AEntityDelete,
    AIdentityProviderAccounts,
    APagination,
    usePermissionCheck,
    useTranslations,
} from '@authup/client-web-kit';
import type { TableColumn } from '@vuecs/table';
import type { PropType } from 'vue';
import { computed } from 'vue';
import { defineNuxtComponent } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    components: {
        AEntityDelete,
        AIdentityProviderAccounts,
        APagination,
    },
    props: {
        entity: {
            type: Object as PropType<User>,
            required: true,
        },
    },
    setup(props) {
        definePageMeta({ [LayoutKey.REQUIRED_PERMISSIONS]: [PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ] });

        const query = computed(() => defineQuery<IdentityProviderAccount>({
            filters: { userId: props.entity.id },
            relations: ['provider'],
            sort: { createdAt: 'DESC' },
        }));

        const hasDropPermission = usePermissionCheck({ name: PermissionName.IDENTITY_PROVIDER_ACCOUNT_DELETE });

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.IDENTITY_PROVIDER,
                count: 1,
            },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.NAME },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.CREATED_AT },
        ]);

        const columns = computed<TableColumn<IdentityProviderAccount>[]>(() => [
            {
                key: 'provider',
                label: translations.identityProvider,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'providerUserName',
                label: translations.name,
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
                key: 'options',
                label: '',
                cellClass: 'text-center',
            },
        ]);

        return {
            query,
            columns,
            hasDropPermission,
        };
    },
});
</script>
<template>
    <AIdentityProviderAccounts
        :query="query"
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
                :columns="columns"
                :busy="props.busy"
            >
                <template #cell-provider="{ row }">
                    {{ row.provider?.displayName || row.provider?.name || row.providerId }}
                </template>
                <template #cell-createdAt="{ row }">
                    <VCTimeago :datetime="row.createdAt" />
                </template>
                <template #cell-options="{ row }">
                    <AEntityDelete
                        :entity-id="row.id"
                        entity-type="identityProviderAccount"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </VCTable>
        </template>
    </AIdentityProviderAccounts>
</template>
