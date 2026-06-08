<script lang="ts">

import {
    ARoleForm,
    TranslatorTranslationDefaultKey,
    TranslatorTranslationNamespace,
    useTranslationsForNamespace,
} from '@authup/client-web-kit';
import type { Role } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent, definePageMeta } from '#imports';
import { LayoutKey } from '../../../config/layout';

export default defineNuxtComponent({
    components: { ARoleForm },
    props: {
        entity: {
            type: Object as PropType<Role>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const translationsDefault = useTranslationsForNamespace(
            TranslatorTranslationNamespace.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.GENERAL },
            ],
        );

        const handleUpdated = (e: Role) => {
            emit('updated', e);
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        return {
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
        <ARoleForm
            :entity="entity"
            @update="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>
