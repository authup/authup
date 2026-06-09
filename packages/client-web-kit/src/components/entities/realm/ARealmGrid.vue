<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Realm } from '@authup/core-kit';
import { defineComponent, onMounted, ref } from 'vue';
import { injectHTTPClient } from '../../../core';

export default defineComponent({
    emits: ['select'],
    setup(_, { emit }) {
        const client = injectHTTPClient();

        const items = ref<Realm[]>([]);
        const busy = ref(false);
        const error = ref<string | null>(null);

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
            } catch (e) {
                error.value = e instanceof Error ? e.message : 'The realms could not be loaded.';
            } finally {
                busy.value = false;
            }
        };

        onMounted(() => load());

        const handleSelect = (realm: Realm) => {
            emit('select', realm);
        };

        return {
            items,
            busy,
            error,
            handleSelect,
        };
    },
});
</script>
<template>
    <div>
        <div
            v-if="error"
            class="alert alert-warning"
        >
            {{ error }}
        </div>

        <div
            v-if="busy"
            class="text-center"
        >
            <span class="fa-solid fa-spinner fa-spin" />
        </div>

        <div
            v-else
            class="realm-grid"
        >
            <button
                v-for="realm in items"
                :key="realm.id"
                type="button"
                class="realm-grid-item"
                @click.prevent="handleSelect(realm)"
            >
                <span class="fa-solid fa-database" />
                <span class="realm-grid-item-name">
                    {{ realm.display_name || realm.name }}
                </span>
            </button>
        </div>
    </div>
</template>
<style scoped>
.realm-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
}

.realm-grid-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.5rem 1rem;
    border: 1px solid var(--vc-color-border);
    border-radius: 0.5rem;
    background: var(--vc-color-bg-elevated);
    color: var(--vc-color-fg);
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.15s ease;
}

.realm-grid-item:hover {
    border-color: var(--vc-color-primary-500);
    transform: translateY(-2px);
}

.realm-grid-item-name {
    font-weight: 600;
    text-align: center;
    word-break: break-word;
}
</style>
