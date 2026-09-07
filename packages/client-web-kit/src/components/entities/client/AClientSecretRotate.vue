<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Client, ClientSecretRotatePayload } from '@authup/core-kit';
import {
    ClientSecretMode,
    ClientSecretRotateValidator,
    getClientSecretMode,
} from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { IFieldValidation } from '@ilingo/validup-vue';
import { useValidup } from '@validup/vue';
import { VCButton } from '@vuecs/button';
import { VCAlert } from '@vuecs/elements';
import type { FormOption } from '@vuecs/forms';
import { VCFormGroup, VCFormRadioGroup } from '@vuecs/forms';
import { VCIcon } from '@vuecs/icon';
import {
    VCModal,
    VCModalClose,
    VCModalContent,
    VCModalTitle,
} from '@vuecs/overlays';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
} from 'vue';
import { extractErrorContext, injectHTTPClient, useTranslations } from '../../../core';
import { ASecretInput } from '../../utility';

/**
 * Rotates a client's secret through `POST /clients/:id/secret`, the one
 * writer of a secret on a client that is not stored plain. An empty secret
 * lets the server generate one; the mode defaults to the client's current
 * storage mode. The returned plaintext exists in that response only, so it
 * is rendered once, with a copy button, and dropped when the dialog closes.
 */
export default defineComponent({
    name: 'AClientSecretRotate',
    components: {
        ASecretInput,
        IFieldValidation,
        VCAlert,
        VCButton,
        VCFormGroup,
        VCFormRadioGroup,
        VCIcon,
        VCModal,
        VCModalClose,
        VCModalContent,
        VCModalTitle,
    },
    props: {
        entity: {
            type: Object as PropType<Client>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        const apiClient = injectHTTPClient();

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.SECRET_ROTATE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.SECRET_ROTATE_HINT },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.SECRET_MODE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.SECRET_MODE_PLAIN },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.SECRET_MODE_HASHED },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.SECRET_MODE_ENCRYPTED },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.SECRET_MODE_ENCRYPTED_HINT },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.SECRET_SHOW_ONCE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.SECRET_COPY },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.SECRET_COPIED },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.SECRET },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.CLOSE },
        ]);

        const open = ref(false);
        const busy = ref(false);
        const error = ref<string | null>(null);
        // the show-once plaintext; set only by a successful rotation
        const secret = ref<string | null>(null);
        const copied = ref(false);

        const modeOptions = computed<FormOption[]>(() => [
            { value: ClientSecretMode.PLAIN, label: translations.secretModePlain },
            { value: ClientSecretMode.HASHED, label: translations.secretModeHashed },
            { value: ClientSecretMode.ENCRYPTED, label: translations.secretModeEncrypted },
        ]);

        // The default must be an offered mode, or an untouched submit is
        // refused; a row carrying a mode the dialog does not offer falls
        // back to plain.
        const defaultMode = () : `${ClientSecretMode}` => {
            const mode = getClientSecretMode(props.entity);

            return modeOptions.value.some((option) => option.value === mode) ?
                mode :
                ClientSecretMode.PLAIN;
        };

        const form = reactive<{ secret: string, mode: `${ClientSecretMode}` }>({
            secret: '',
            mode: defaultMode(),
        });

        const v = useValidup(new ClientSecretRotateValidator(), form);

        const isEncryptedMode = computed(() => v.fields.mode.$model.value === ClientSecretMode.ENCRYPTED);

        const setMode = (next: unknown) => {
            v.fields.mode.$model.value = next as `${ClientSecretMode}`;
        };

        const reset = () => {
            form.secret = '';
            form.mode = defaultMode();
            secret.value = null;
            error.value = null;
            copied.value = false;
        };

        // reset on both edges: opening re-reads the entity's current mode,
        // closing drops the plaintext from state and DOM.
        const setOpen = (value: boolean) => {
            reset();
            open.value = value;
        };

        const submit = async () => {
            if (busy.value || v.$invalid.value) {
                return;
            }

            busy.value = true;
            error.value = null;
            try {
                const payload : ClientSecretRotatePayload = { mode: form.mode };
                if (form.secret) {
                    payload.secret = form.secret;
                }

                const response = await apiClient.client.rotateSecret(props.entity.id, payload);

                secret.value = response.meta.secret;
                emit('updated', response.data);
            } catch (e) {
                error.value = extractErrorContext(e).message ?? null;
                emit('failed', e);
            } finally {
                busy.value = false;
            }
        };

        const copy = async () => {
            if (!secret.value) {
                return;
            }

            if (typeof navigator === 'undefined' || !navigator.clipboard) {
                return;
            }

            try {
                await navigator.clipboard.writeText(secret.value);
                copied.value = true;
            } catch {
                copied.value = false;
            }
        };

        return {
            translations,
            v,
            open,
            busy,
            error,
            secret,
            copied,
            modeOptions,
            isEncryptedMode,
            setMode,
            setOpen,
            submit,
            copy,
        };
    },
});
</script>
<template>
    <div>
        <VCButton
            color="primary"
            variant="outline"
            size="sm"
            :label="translations.secretRotate"
            @click="setOpen(true)"
        >
            <template #leading>
                <VCIcon name="fa6-solid:arrows-rotate" />
            </template>
        </VCButton>

        <VCModal
            :open="open"
            @update:open="setOpen"
        >
            <VCModalContent>
                <div class="flex items-center justify-between gap-2 mb-3">
                    <VCModalTitle>{{ translations.secretRotate }}</VCModalTitle>
                    <VCModalClose
                        class="text-fg-muted hover:text-fg"
                        :aria-label="translations.close"
                    >
                        <VCIcon name="fa6-solid:xmark" />
                    </VCModalClose>
                </div>

                <VCAlert
                    v-if="error"
                    color="error"
                    variant="soft"
                    class="mb-3"
                >
                    {{ error }}
                </VCAlert>

                <!-- show the returned plaintext once -->
                <template v-if="secret !== null">
                    <VCAlert
                        color="warning"
                        variant="soft"
                        class="mb-3"
                    >
                        {{ translations.secretShowOnce }}
                    </VCAlert>
                    <code class="block font-mono break-all rounded-md bg-bg-muted p-3 mb-3">{{ secret }}</code>
                    <div class="flex gap-2">
                        <VCButton
                            color="primary"
                            :label="copied ? translations.secretCopied : translations.secretCopy"
                            @click="copy"
                        >
                            <template #leading>
                                <VCIcon :name="copied ? 'fa6-solid:check' : 'fa6-solid:copy'" />
                            </template>
                        </VCButton>
                        <VCButton
                            color="neutral"
                            :label="translations.close"
                            @click="setOpen(false)"
                        />
                    </div>
                </template>

                <form
                    v-else
                    @submit.prevent="submit"
                >
                    <IFieldValidation
                        v-slot="{ value }"
                        :field="v.fields.secret"
                    >
                        <VCFormGroup :validation="value">
                            <template #label>
                                {{ translations.secret }}
                            </template>
                            <ASecretInput
                                :model-value="v.fields.secret.$model.value ?? ''"
                                @update:model-value="(next: string) => { v.fields.secret.$model.value = next; }"
                            />
                            <template #hint>
                                {{ translations.secretRotateHint }}
                            </template>
                        </VCFormGroup>
                    </IFieldValidation>
                    <IFieldValidation
                        v-slot="{ value }"
                        :field="v.fields.mode"
                    >
                        <VCFormGroup :validation="value">
                            <template #label>
                                {{ translations.secretMode }}
                            </template>
                            <VCFormRadioGroup
                                :model-value="v.fields.mode.$model.value"
                                :options="modeOptions"
                                @update:model-value="setMode"
                            />
                            <template
                                v-if="isEncryptedMode"
                                #hint
                            >
                                {{ translations.secretModeEncryptedHint }}
                            </template>
                        </VCFormGroup>
                    </IFieldValidation>
                    <div class="flex gap-2">
                        <VCButton
                            type="submit"
                            color="primary"
                            :disabled="busy || v.$invalid.value"
                            :busy="busy"
                            :label="translations.secretRotate"
                        />
                        <VCButton
                            color="neutral"
                            :disabled="busy"
                            :label="translations.abort"
                            @click="setOpen(false)"
                        />
                    </div>
                </form>
            </VCModalContent>
        </VCModal>
    </div>
</template>
