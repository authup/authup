<script lang="ts">
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { ARealmForm, useTranslations } from '@authup/client-web-kit';
import type { RealmEndpoints } from '@authup/core-http-kit';
import type { Realm } from '@authup/core-kit';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import type { PropType } from 'vue';
import { defineComponent, ref, watch } from 'vue';

export default defineComponent({
    components: {
        ARealmForm,
        VCButton,
        VCIcon,
    },
    props: {
        entity: {
            type: Object as PropType<Realm>,
            required: true,
        },
        endpoints: {
            type: Object as PropType<RealmEndpoints>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        const translationsDefault = useTranslations(
            [
                {
                    namespace: TranslatorTranslationNamespace.COMMON,
                    key: TranslatorTranslationCommonKey.GENERAL,
                },
                {
                    namespace: TranslatorTranslationNamespace.COMMON,
                    key: TranslatorTranslationCommonKey.ENDPOINTS,
                },
                {
                    namespace: TranslatorTranslationNamespace.APP,
                    key: TranslatorTranslationAppKey.ISSUER,
                },
                {
                    namespace: TranslatorTranslationNamespace.APP,
                    key: TranslatorTranslationAppKey.OPENID_CONFIGURATION_URL,
                },
                {
                    namespace: TranslatorTranslationNamespace.APP,
                    key: TranslatorTranslationAppKey.JWKS_URL,
                },
                {
                    namespace: TranslatorTranslationNamespace.ACTION,
                    key: TranslatorTranslationActionKey.COPY,
                },
                {
                    namespace: TranslatorTranslationNamespace.ACTION,
                    key: TranslatorTranslationActionKey.COPIED,
                },
            ],
        );

        const copied = ref<keyof RealmEndpoints | null>(null);

        watch(() => props.endpoints, () => {
            copied.value = null;
        });

        const copy = async (key: keyof RealmEndpoints) => {
            if (typeof navigator === 'undefined' || !navigator.clipboard) {
                return;
            }

            try {
                await navigator.clipboard.writeText(props.endpoints[key]);
                copied.value = key;
            } catch {
                copied.value = null;
            }
        };

        const handleUpdated = (e: Realm) => {
            emit('updated', e);
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        return {
            copied,
            copy,
            handleUpdated,
            handleFailed,
            translationsDefault,
        };
    },
});
</script>
<template>
    <div>
        <h6 class="title">
            {{ translationsDefault.general }}
        </h6>
        <ARealmForm
            :entity="entity"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
        <h6 class="title mt-4">
            {{ translationsDefault.endpoints }}
        </h6>
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border py-1 text-sm">
            <span class="text-fg-muted">{{ translationsDefault.issuer }}</span>
            <div class="flex items-center gap-2">
                <span class="text-right break-all font-mono">{{ endpoints.issuer }}</span>
                <VCButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    :label="copied === 'issuer' ? translationsDefault.copied : translationsDefault.copy"
                    @click="copy('issuer')"
                >
                    <template #leading>
                        <VCIcon :name="copied === 'issuer' ? 'fa6-solid:check' : 'fa6-solid:copy'" />
                    </template>
                </VCButton>
            </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border py-1 text-sm">
            <span class="text-fg-muted">{{ translationsDefault.openidConfigurationUrl }}</span>
            <div class="flex items-center gap-2">
                <a
                    :href="endpoints.openidConfiguration"
                    target="_blank"
                    rel="noopener"
                    class="text-right break-all font-mono"
                >{{ endpoints.openidConfiguration }}</a>
                <VCButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    :label="copied === 'openidConfiguration' ? translationsDefault.copied : translationsDefault.copy"
                    @click="copy('openidConfiguration')"
                >
                    <template #leading>
                        <VCIcon :name="copied === 'openidConfiguration' ? 'fa6-solid:check' : 'fa6-solid:copy'" />
                    </template>
                </VCButton>
            </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 py-1 text-sm">
            <span class="text-fg-muted">{{ translationsDefault.jwksUrl }}</span>
            <div class="flex items-center gap-2">
                <a
                    :href="endpoints.jwks"
                    target="_blank"
                    rel="noopener"
                    class="text-right break-all font-mono"
                >{{ endpoints.jwks }}</a>
                <VCButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    :label="copied === 'jwks' ? translationsDefault.copied : translationsDefault.copy"
                    @click="copy('jwks')"
                >
                    <template #leading>
                        <VCIcon :name="copied === 'jwks' ? 'fa6-solid:check' : 'fa6-solid:copy'" />
                    </template>
                </VCButton>
            </div>
        </div>
    </div>
</template>
