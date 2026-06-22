<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->

<script lang="ts">
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    ref,
} from 'vue';
import AFormInputListItem from './AFormInputListItem.vue';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { VCAlert } from '@vuecs/elements';
import { useTranslations } from '../../../core';

export default defineComponent({
    components: { AFormInputListItem, VCAlert },
    props: {
        names: {
            type: Array as PropType<string[]>,
            default: () => [],
        },
        minItems: {
            type: Number,
            default: 0,
        },
        maxItems: {
            type: Number,
            default: 100,
        },
    },
    emits: ['changed'],
    setup(props, setup) {
        const translationsAction = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ADD,
            },
        ]);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAMES,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.NO_ITEMS,
            },
        ]);

        let counter = 0;
        const items = ref<{
            id: number,
            value: string 
        }[]>([]);

        const add = (item?: string) => {
            items.value.push({
                id: counter++,
                value: item || '',
            });
        };

        function assign() {
            items.value = [];

            props.names.map((el) => add(el));

            if (items.value.length < props.minItems) {
                for (let i = 0; i < props.minItems - items.value.length; i++) {
                    add();
                }
            }
        }

        setup.expose({ assign });

        assign();

        const canAdd = computed(() => items.value.length < props.maxItems);

        const canDrop = computed(() => items.value.length > props.minItems);

        const emitUpdated = () => {
            setup.emit('changed', [
                ...items.value
                    .map((el) => el.value)
                    .filter(Boolean),
            ]);
        };

        const handleUpdated = (id: number, value: string) => {
            const index = items.value.findIndex((el) => el.id === id);
            if (index > -1 && items.value[index]) {
                items.value[index].value = value;
            }

            emitUpdated();
        };

        const handleDeleted = (id: number) => {
            if (items.value.length <= props.minItems) {
                return;
            }

            const index = items.value.findIndex((el) => el.id === id);
            if (index > -1) {
                items.value.splice(index, 1);
            }

            emitUpdated();
        };

        return {
            add,

            canAdd,
            canDrop,

            handleDeleted,
            handleUpdated,

            items,

            translationsAction,
            translationsDefault,
        };
    },
});
</script>
<template>
    <div class="flex flex-col gap-2">
        <div class="flex flex-row">
            <div class="self-end">
                <slot name="label">
                    {{ translationsDefault.names }}
                </slot>
            </div>
            <div class="ms-auto">
                <button
                    class="btn btn-xs btn-primary"
                    type="button"
                    :disabled="!canAdd"
                    @click.prevent="add()"
                >
                    <VCIcon name="fa6-solid:plus" /> {{ translationsAction.add }}
                </button>
            </div>
        </div>
        <div class="flex flex-col gap-1">
            <template v-if="items.length === 0">
                <slot name="noItems">
                    <VCAlert
                        color="info"
                        variant="soft"
                        size="sm"
                        class="mb-3"
                    >
                        {{ translationsDefault.noItems }}
                    </VCAlert>
                </slot>
            </template>
            <template
                v-for="item in items"
                :key="item.id"
            >
                <slot
                    name="default"
                    :item="item"
                    :updated="handleUpdated"
                    :deleted="handleDeleted"
                >
                    <AFormInputListItem
                        :key="item.id"
                        :disabled="!canDrop"
                        :name="item.value"
                        @updated="(input) => { handleUpdated(item.id, input) }"
                        @deleted="() => { handleDeleted(item.id) }"
                    />
                </slot>
            </template>
        </div>
        <slot name="hint" />
    </div>
</template>
