<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { UserAuthenticator } from '@authup/core-kit';
import { UserAuthenticatorKind } from '@authup/core-kit';
import {
    computed,
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
import { VCIcon } from '@vuecs/icon';
import {
    VCModal,
    VCModalClose,
    VCModalContent,
    VCModalTitle,
    useAlertDialog,
} from '@vuecs/overlays';
import { extractErrorContext, injectHTTPClient, useTranslations } from '../../../core';
import AUserAuthenticatorEnroll from './AUserAuthenticatorEnroll.vue';
import { USER_AUTHENTICATOR_KIND_ICONS } from './constants';

export default defineComponent({
    components: {
        VCButton,
        VCAlert,
        VCIcon,
        VCModal,
        VCModalContent,
        VCModalTitle,
        VCModalClose,
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
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_TOTP },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_RECOVERY },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_EMAIL },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_ENROLL_WEBAUTHN },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_NO_DEVICES },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.MFA_DEVICE_UNCONFIRMED },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ADD },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.DELETE },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.CLOSE },
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
        const adding = ref(false);

        const kindIcons = USER_AUTHENTICATOR_KIND_ICONS;
        const kindLabels = computed<Record<`${UserAuthenticatorKind}`, string>>(() => ({
            [UserAuthenticatorKind.TOTP]: translations.mfaEnrollTotp,
            [UserAuthenticatorKind.WEBAUTHN]: translations.mfaEnrollWebauthn,
            [UserAuthenticatorKind.EMAIL]: translations.mfaEnrollEmail,
            [UserAuthenticatorKind.RECOVERY]: translations.mfaEnrollRecovery,
        }));

        const load = async () => {
            busy.value = true;
            error.value = null;
            try {
                const response = await apiClient.userAuthenticator.getMany(props.userId, { sorts: { createdAt: 'DESC' } });
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

            // recovery codes are displayed once, right after creation —
            // keep the enrollment dialog open until the user closes it.
            if (entity.kind !== UserAuthenticatorKind.RECOVERY) {
                adding.value = false;
            }
        };

        onMounted(() => load());

        return {
            translations,
            items,
            busy,
            error,
            adding,
            kindIcons,
            kindLabels,
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

        <div class="flex items-center justify-end mb-3">
            <VCButton
                color="primary"
                size="sm"
                :label="translations.add"
                @click="adding = true"
            >
                <template #leading>
                    <VCIcon name="fa6-solid:plus" />
                </template>
            </VCButton>
        </div>

        <VCAlert
            v-if="!busy && items.length === 0"
            color="info"
            variant="soft"
            size="sm"
        >
            {{ translations.mfaNoDevices }}
        </VCAlert>

        <ul
            v-if="items.length > 0"
            class="flex flex-col gap-2"
        >
            <li
                v-for="item in items"
                :key="item.id"
                class="flex items-center gap-3 rounded-lg border border-border p-3"
            >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-muted text-fg-muted">
                    <VCIcon :name="kindIcons[item.kind]" />
                </span>
                <span class="flex min-w-0 grow flex-col">
                    <span class="font-semibold">{{ kindLabels[item.kind] }}</span>
                    <span
                        v-if="item.name"
                        class="text-sm text-fg-muted truncate"
                    >{{ item.name }}</span>
                </span>
                <span
                    v-if="!item.confirmed"
                    class="shrink-0 text-sm text-warning-600"
                >
                    {{ translations.mfaDeviceUnconfirmed }}
                </span>
                <VCButton
                    color="error"
                    variant="outline"
                    size="sm"
                    :label="translations.delete"
                    @click="drop(item)"
                />
            </li>
        </ul>

        <VCModal
            :open="adding"
            @update:open="(value) => { adding = value; }"
        >
            <VCModalContent>
                <div class="flex items-center justify-between gap-2">
                    <VCModalTitle>{{ translations.mfaEnrollTitle }}</VCModalTitle>
                    <VCModalClose
                        class="text-fg-muted hover:text-fg"
                        :aria-label="translations.close"
                    >
                        <VCIcon name="fa6-solid:xmark" />
                    </VCModalClose>
                </div>
                <AUserAuthenticatorEnroll
                    v-if="adding"
                    :user-id="userId"
                    @done="handleCreated"
                    @closed="adding = false"
                />
            </VCModalContent>
        </VCModal>
    </div>
</template>
