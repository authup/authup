<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { UserAuthenticator } from '@authup/core-kit';
import {
    defineComponent,
    onMounted,
    ref,
} from 'vue';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import { VCAlert } from '@vuecs/elements';
import { useAlertDialog } from '@vuecs/overlays';
import { extractErrorContext, injectHTTPClient, useTranslations } from '../../../core';
import AUserAuthenticatorEnroll from './AUserAuthenticatorEnroll.vue';

export default defineComponent({
    components: {
        VCButton,
        VCAlert,
        AUserAuthenticatorEnroll,
    },
    props: {
        userId: {
            type: String,
            default: '@me',
        },
    },
    emits: ['deleted', 'created'],
    setup(props, { emit }) {
        const apiClient = injectHTTPClient();

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_TITLE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_NO_DEVICES },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_DEVICE_UNCONFIRMED },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.DELETE },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.REMOVE_CONFIRM_TITLE },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.DELETE_CONFIRM_DESCRIPTION },
        ]);

        // Deleting an MFA device is irreversible and weakens the account's
        // security posture — gate it behind a confirmation, like other
        // destructive kit actions. Resolves false in SSR / without the overlay
        // provider, so the delete is simply not performed there.
        const confirmDialog = useAlertDialog();

        const items = ref<UserAuthenticator[]>([]);
        const busy = ref(false);
        const error = ref<string | null>(null);

        const load = async () => {
            busy.value = true;
            error.value = null;
            try {
                const response = await apiClient.userAuthenticator.getMany(props.userId, { sort: { created_at: 'DESC' } });
                items.value = response.data;
            } catch (e) {
                error.value = extractErrorContext(e).message ?? null;
            } finally {
                busy.value = false;
            }
        };

        const drop = async (item: UserAuthenticator) => {
            const confirmed = await confirmDialog({
                title: translations.removeConfirmTitle,
                description: translations.deleteConfirmDescription,
                confirmLabel: translations.delete,
                cancelLabel: translations.abort,
                tone: 'error',
            });
            if (!confirmed) {
                return;
            }

            try {
                await apiClient.userAuthenticator.delete(props.userId, item.id);
                items.value = items.value.filter((entity) => entity.id !== item.id);
                emit('deleted', item);
            } catch (e) {
                error.value = extractErrorContext(e).message ?? null;
            }
        };

        const handleCreated = (entity: UserAuthenticator) => {
            emit('created', entity);
            load();
        };

        onMounted(() => load());

        return {
            translations,
            items,
            busy,
            error,
            drop,
            handleCreated,
        };
    },
});
</script>
<template>
    <div>
        <VCAlert
            v-if="error"
            color="error"
            variant="soft"
            class="mb-3"
        >
            {{ error }}
        </VCAlert>

        <p
            v-if="!busy && items.length === 0"
            class="text-fg-muted mb-3"
        >
            {{ translations.mfaNoDevices }}
        </p>

        <ul
            v-else
            class="flex flex-col gap-2 mb-4"
        >
            <li
                v-for="item in items"
                :key="item.id"
                class="flex items-center justify-between"
            >
                <span>
                    <strong>{{ item.name || item.kind }}</strong>
                    <span class="text-fg-muted"> ({{ item.kind }})</span>
                    <span
                        v-if="!item.confirmed"
                        class="text-warning-600"
                    > — {{ translations.mfaDeviceUnconfirmed }}</span>
                </span>
                <VCButton
                    color="error"
                    size="sm"
                    :label="translations.delete"
                    @click="drop(item)"
                />
            </li>
        </ul>

        <div>
            <h6 class="font-bold mb-2">
                {{ translations.mfaEnrollTitle }}
            </h6>
            <AUserAuthenticatorEnroll
                :user-id="userId"
                @done="handleCreated"
            />
        </div>
    </div>
</template>
