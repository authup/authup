<script lang="ts">
import type { TrustAnchor } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useTranslator } from '@authup/client-web-kit';
import { defineNuxtComponent } from '#app';
import { useErrorToast, useToast } from '#imports';

export default defineNuxtComponent({
    setup() {
        const toast = useToast();
        const errorToast = useErrorToast();
        const translate = useTranslator();

        const handleDeleted = async (entity: TrustAnchor) => {
            if (!toast) {
                return;
            }

            toast.show({
                variant: 'success',
                body: await translate({
                    namespace: TranslatorTranslationNamespace.APP,
                    key: TranslatorTranslationAppKey.ENTITY_DELETED,
                    data: {
                        entity: await translate({
                            namespace: TranslatorTranslationNamespace.ENTITY,
                            key: TranslatorTranslationEntityKey.TRUST_ANCHOR,
                            count: 1,
                        }),
                        name: entity.name,
                    },
                }),
            });
        };

        const handleFailed = (e: Error) => errorToast.show(e);

        return {
            handleDeleted,
            handleFailed,
        };
    },
});
</script>

<template>
    <NuxtPage
        @deleted="handleDeleted"
        @failed="handleFailed"
    />
</template>
