<script lang="ts">
import {
    ARealmForm,
    TranslatorTranslationDefaultKey,
    TranslatorTranslationNamespace,
    useTranslationsForNamespace,
} from '@authup/client-web-kit';
import type { Realm } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent, definePageMeta } from '#imports';
import { LayoutKey } from '../../../config/layout';

export default defineNuxtComponent({
    components: { ARealmForm },
    props: {
        entity: {
            type: Object as PropType<Realm>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.REALM_UPDATE,
            ],
        });

        const translationsDefault = useTranslationsForNamespace(
            TranslatorTranslationNamespace.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.GENERAL },
            ],
        );

        const handleUpdated = (e: Realm) => {
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
        <ARealmForm
            :entity="entity"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>
