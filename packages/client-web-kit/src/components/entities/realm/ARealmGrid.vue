<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Realm } from '@authup/core-kit';
import {
    computed,
    defineComponent,
    onMounted,
    ref,
} from 'vue';
import {
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { injectHTTPClient, useTranslations } from '../../../core';

export default defineComponent({
    props: {
        // When exactly one realm is available, emit `select` for it
        // immediately instead of rendering a single-tile chooser. Lets the
        // common single-realm deployment skip the picker entirely.
        autoSelectSingle: {
            type: Boolean,
            default: true,
        },
        // Reveal the filter input only once the realm count crosses this
        // threshold — small deployments stay clutter-free.
        searchThreshold: {
            type: Number,
            default: 8,
        },
    },
    emits: ['select'],
    setup(props, { emit }) {
        const client = injectHTTPClient();

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.SEARCH,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.NO_RESULTS,
            },
        ]);

        const items = ref<Realm[]>([]);
        const busy = ref(false);
        // False until the first load settles. The SSR pass and the first
        // hydration frame run before onMounted's load(), so without this
        // gate the grid would paint the "no results" empty state (with its
        // still-unresolved translation fallback) instead of the skeleton.
        const loaded = ref(false);
        const error = ref<string | null>(null);
        const search = ref('');

        // Kept true from the single-realm auto-select until the browser
        // navigates away, so the skeleton stays up instead of flashing the
        // lone tile for a frame.
        const redirecting = ref(false);

        const load = async () => {
            if (busy.value) {
                return;
            }

            busy.value = true;
            error.value = null;

            try {
                const response = await client.realm.getMany({
                    sort: { name: 'ASC' },
                    pagination: { limit: 100 },
                });

                items.value = response.data;

                if (props.autoSelectSingle && items.value.length === 1) {
                    redirecting.value = true;
                    emit('select', items.value[0]);
                }
            } catch (e) {
                error.value = e instanceof Error ? e.message : 'The realms could not be loaded.';
            } finally {
                busy.value = false;
                loaded.value = true;
            }
        };

        onMounted(() => load());

        const showSearch = computed(() => items.value.length > props.searchThreshold);

        const filtered = computed(() => {
            const term = search.value.trim().toLowerCase();
            if (!term) {
                return items.value;
            }

            return items.value.filter((realm) => {
                const haystack = `${realm.display_name || ''} ${realm.name || ''}`.toLowerCase();
                return haystack.includes(term);
            });
        });

        const labelFor = (realm: Realm) => realm.display_name || realm.name;

        // Show the technical name beneath the label only when a display
        // name shadows it — otherwise the tile would repeat itself.
        const slugFor = (realm: Realm) => (
            realm.display_name && realm.display_name !== realm.name ?
                realm.name :
                null
        );

        const handleSelect = (realm: Realm) => {
            emit('select', realm);
        };

        // Recovery hatch for the auto-select path: if the parent's redirect
        // glue fails (e.g. PKCE crypto unavailable on an insecure origin) it
        // can call this to drop the skeleton and re-show the tiles instead of
        // stranding the user. Exposed via template ref.
        const reset = () => {
            redirecting.value = false;
        };

        return {
            items,
            busy,
            loaded,
            error,
            search,
            redirecting,
            showSearch,
            filtered,
            translations,
            labelFor,
            slugFor,
            handleSelect,
            reset,
        };
    },
});
</script>
<template>
    <div class="a-realm-select">
        <div
            v-if="error"
            class="alert alert-danger a-realm-select-alert"
        >
            {{ error }}
        </div>

        <div
            v-if="!loaded || busy || redirecting"
            class="a-realm-grid"
            aria-hidden="true"
        >
            <div
                v-for="n in 6"
                :key="n"
                class="a-realm-grid-item a-realm-grid-item--skeleton"
            />
        </div>

        <template v-else>
            <div
                v-if="showSearch"
                class="a-realm-search"
            >
                <VCIcon
                    name="fa6-solid:magnifying-glass"
                    class="a-realm-search-icon"
                />
                <input
                    v-model="search"
                    type="text"
                    class="a-realm-search-input"
                    :placeholder="translations.search"
                >
            </div>

            <div
                v-if="filtered.length === 0"
                class="a-realm-empty"
            >
                <VCIcon
                    name="fa6-solid:folder-open"
                    class="a-realm-empty-icon"
                />
                <span>{{ translations.noResults }}</span>
            </div>

            <div
                v-else
                class="a-realm-grid"
            >
                <button
                    v-for="realm in filtered"
                    :key="realm.id"
                    type="button"
                    class="a-realm-grid-item"
                    @click.prevent="handleSelect(realm)"
                >
                    <span class="a-realm-grid-item-name">
                        {{ labelFor(realm) }}
                    </span>
                    <span
                        v-if="slugFor(realm)"
                        class="a-realm-grid-item-slug"
                    >
                        {{ slugFor(realm) }}
                    </span>
                </button>
            </div>
        </template>
    </div>
</template>
