/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import {
    type PropType, computed, defineComponent, h, ref, toRef, watch,
} from 'vue';
import type { ResourceCollectionVSlots } from '../../core';
import { defineResourceCollectionVProps } from '../../core';
import { APagination, ASearch, renderToggleButton } from '../utility';
import { ARealms } from './ARealms';

export const ARealmPicker = defineComponent({
    props: {
        value: {
            type: [Array, String] as PropType<string[] | string | null>,
        },
        multiple: {
            type: Boolean as PropType<boolean | undefined>,
        },
        ...defineResourceCollectionVProps<Realm>(),
    },
    emits: ['change'],
    setup(props, { emit, attrs }) {
        const value = toRef(props, 'value');
        const items = ref<string[]>([]);

        const assignItems = (input?: string[] | string | null) => {
            if (Array.isArray(input)) {
                items.value = input;
            } else if (input) {
                items.value = [input];
            } else {
                items.value = [];
            }
        };

        const isMultiSelection = computed(() => {
            if (typeof props.multiple === 'boolean') {
                return props.multiple;
            }

            return Array.isArray(value.value);
        });

        assignItems(value.value);

        watch(value, (input) => assignItems(input));

        return () => h(ARealms, { ...props, ...attrs }, {
            [SlotName.HEADER]: (slotProps: ResourceCollectionVSlots<{ id: string }>['header']) => [
                h(ASearch, {
                    load: (payload: any) => {
                        if (slotProps.load) {
                            return slotProps.load(payload);
                        }

                        return undefined;
                    },
                    busy: slotProps.busy,
                }),
            ],
            [SlotName.FOOTER]: (slotProps: ResourceCollectionVSlots<{ id: string }>['footer']) => [
                h(APagination, {
                    load: (payload: any) => {
                        if (slotProps.load) {
                            return slotProps.load(payload);
                        }

                        return undefined;
                    },
                    busy: slotProps.busy,
                    meta: slotProps.meta,
                }),
            ],
            [SlotName.ITEM_ACTIONS]: (
                slotProps: ResourceCollectionVSlots<{ id: string }>['itemActions'],
            ) => renderToggleButton({
                value: items.value.indexOf(slotProps.data.id) !== -1,
                isBusy: slotProps.busy,
                changed(value) {
                    const index = items.value!.indexOf(slotProps.data.id);

                    if (value) {
                        if (isMultiSelection.value) {
                            if (index === -1) {
                                items.value!.push(slotProps.data.id);
                            }
                        } else {
                            items.value = [slotProps.data.id];
                        }
                    } else if (isMultiSelection.value) {
                        if (index !== -1) {
                            items.value!.splice(index, 1);
                        }
                    } else {
                        items.value = [];
                    }

                    emit('change', [...items.value]);
                },
            }),
        });
    },
});
