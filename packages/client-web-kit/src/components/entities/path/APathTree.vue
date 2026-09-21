<script lang="ts">
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path } from '@authup/core-kit';
import { PATH_SEPARATOR } from '@authup/core-kit';
import {
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
    TranslatorTranslationVuecsKey,
} from '@authup/i18n';
import { parseTreePaths } from '@vuecs/tree';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    ref,
    watch,
} from 'vue';
import { buildPathTreeExpansion, useTranslation } from '../../../core';

export default defineComponent({
    props: {
        /**
         * The folders to render. Only the derived `path` is read, so the
         * caller may hand over whatever projection it already holds.
         */
        paths: {
            type: Array as PropType<Path[]>,
            default: () => [],
        },
        /** The selected folder's full path, or null while nothing is scoped. */
        modelValue: {
            type: String as PropType<string | null>,
            default: null,
        },
    },
    emits: ['update:modelValue', 'change'],
    setup(props, { emit }) {
        // `parseTreePaths` keeps first-seen order per level, so the sort is
        // what makes the pane alphabetical whatever order the rows arrived
        // in. The paths are unique per realm, but a caller merging pages can
        // repeat one, and a duplicate would otherwise mint a second node.
        const items = computed(() => parseTreePaths(
            [...new Set(props.paths.map((entry) => entry.path))].sort(),
            PATH_SEPARATOR,
        ));

        const expanded = ref<string[]>(buildPathTreeExpansion(props.modelValue));

        // The selection moves on its own when the route changes (a crumb, a
        // shared link, the back button), and the chain to it has to open
        // without collapsing what the visitor opened by hand.
        watch(() => props.modelValue, (value) => {
            const keys = buildPathTreeExpansion(value);
            const missing = keys.filter((key) => !expanded.value.includes(key));

            if (missing.length > 0) {
                expanded.value = [...expanded.value, ...missing];
            }
        });

        const select = (value: string | string[] | null) => {
            // The tree is single-select, so an array can only come from a
            // caller that turned `multiple` on, which this pane never does.
            const next = Array.isArray(value) ? value[0] ?? null : value;

            emit('update:modelValue', next);
            emit('change', next);
        };

        const translationName = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.PATH,
            count: 2,
        });

        const translationEmpty = useTranslation({
            namespace: TranslatorTranslationNamespace.VUECS,
            key: TranslatorTranslationVuecsKey.NO_MORE,
            data: { name: translationName },
        });

        return {
            items,
            expanded,
            select,
            translationEmpty,
        };
    },
});
</script>
<template>
    <VCTree
        :items="items"
        :selection="modelValue"
        :expanded="expanded"
        :item-theme-variant="{ size: 'sm' }"
        @update:selection="select"
        @update:expanded="expanded = $event"
    >
        <template #empty>
            <span>{{ translationEmpty }}</span>
        </template>
    </VCTree>
</template>
