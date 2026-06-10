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

        return {
            items,
            busy,
            error,
            search,
            redirecting,
            showSearch,
            filtered,
            translations,
            labelFor,
            slugFor,
            handleSelect,
        };
    },
});
</script>
<template>
    <div class="realm-select">
        <div
            v-if="error"
            class="alert alert-danger realm-select-alert"
        >
            {{ error }}
        </div>

        <div
            v-if="busy || redirecting"
            class="realm-grid"
            aria-hidden="true"
        >
            <div
                v-for="n in 6"
                :key="n"
                class="realm-grid-item realm-grid-item--skeleton"
            />
        </div>

        <template v-else>
            <div
                v-if="showSearch"
                class="realm-search"
            >
                <VCIcon
                    name="fa6-solid:magnifying-glass"
                    class="realm-search-icon"
                />
                <input
                    v-model="search"
                    type="text"
                    class="realm-search-input"
                    :placeholder="translations.search"
                >
            </div>

            <div
                v-if="filtered.length === 0"
                class="realm-empty"
            >
                <VCIcon
                    name="fa6-solid:folder-open"
                    class="realm-empty-icon"
                />
                <span>{{ translations.noResults }}</span>
            </div>

            <div
                v-else
                class="realm-grid"
            >
                <button
                    v-for="realm in filtered"
                    :key="realm.id"
                    type="button"
                    class="realm-grid-item"
                    @click.prevent="handleSelect(realm)"
                >
                    <span class="realm-grid-item-name">
                        {{ labelFor(realm) }}
                    </span>
                    <span
                        v-if="slugFor(realm)"
                        class="realm-grid-item-slug"
                    >
                        {{ slugFor(realm) }}
                    </span>
                </button>
            </div>
        </template>
    </div>
</template>
<style scoped>
.realm-select-alert {
    margin-bottom: 1rem;
}

.realm-search {
    position: relative;
    margin-bottom: 1.25rem;
}

.realm-search-icon {
    position: absolute;
    top: 50%;
    left: 0.9rem;
    transform: translateY(-50%);
    color: var(--vc-color-fg-muted);
    pointer-events: none;
}

.realm-search-input {
    width: 100%;
    padding: 0.65rem 1rem 0.65rem 2.4rem;
    border: 1px solid var(--vc-color-border);
    border-radius: 0.65rem;
    background: var(--vc-color-bg-elevated);
    color: var(--vc-color-fg);
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.realm-search-input:focus {
    border-color: var(--authup-periwinkle, var(--vc-color-primary-500));
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--authup-periwinkle, var(--vc-color-primary-500)) 25%, transparent);
}

.realm-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
}

.realm-grid-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    min-height: 6.25rem;
    padding: 1.25rem 1rem;
    border: 1px solid var(--vc-color-border);
    border-radius: 0.85rem;
    background: var(--vc-color-bg-elevated);
    color: var(--vc-color-fg);
    cursor: pointer;
    overflow: hidden;
    text-align: center;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

/* Animated gradient border, revealed on hover via the mask-composite
   ring trick (paints only the 1px padding band, leaving the fill clear). */
.realm-grid-item::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(
        120deg,
        var(--authup-periwinkle, #6d7fcc),
        var(--authup-rose, #cc8181),
        var(--authup-periwinkle, #6d7fcc)
    );
    background-size: 200% 200%;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
}

.realm-grid-item:hover {
    transform: translateY(-3px);
    border-color: transparent;
    box-shadow: 0 10px 30px -12px color-mix(in oklab, var(--authup-periwinkle, #6d7fcc) 70%, transparent);
}

.realm-grid-item:hover::before {
    opacity: 1;
    animation: realm-border-pan 3s linear infinite;
}

.realm-grid-item:focus-visible {
    outline: none;
    border-color: transparent;
}

.realm-grid-item:focus-visible::before {
    opacity: 1;
}

.realm-grid-item-name {
    font-weight: 600;
    word-break: break-word;
}

.realm-grid-item-slug {
    color: var(--vc-color-fg-muted);
    font-size: 0.8em;
    word-break: break-word;
}

.realm-grid-item--skeleton {
    cursor: default;
    pointer-events: none;
    border-color: var(--vc-color-border);
    background: linear-gradient(
        90deg,
        var(--vc-color-bg-muted) 25%,
        var(--vc-color-bg-elevated) 37%,
        var(--vc-color-bg-muted) 63%
    );
    background-size: 400% 100%;
    animation: realm-skeleton 1.4s ease infinite;
}

.realm-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.65rem;
    padding: 2.5rem 1rem;
    color: var(--vc-color-fg-muted);
    text-align: center;
}

.realm-empty-icon {
    font-size: 1.75rem;
    opacity: 0.6;
}

@keyframes realm-border-pan {
    to {
        background-position: 200% 0;
    }
}

@keyframes realm-skeleton {
    0% {
        background-position: 100% 50%;
    }

    100% {
        background-position: 0 50%;
    }
}

@media (prefers-reduced-motion: reduce) {
    .realm-grid-item,
    .realm-grid-item::before,
    .realm-grid-item--skeleton {
        transition: none;
        animation: none;
    }
}
</style>
