/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SlotName } from '@vuecs/list-controls';
import type { PropType, Ref, VNodeChild } from 'vue';
import {
    computed, defineComponent, h, ref, resolveComponent, toRef, watch,
} from 'vue';
import {
    type ResourceCollectionVSlots, defineResourceCollectionVProps, hasNormalizedSlot, normalizeSlot,
} from '../core';
import { APagination, ASearch, renderToggleButton } from './utility';

type RecordWithID = {
    id: string,
    [key: string]: any
};

export type EntityPickerVSlots<
    T extends RecordWithID = RecordWithID,
> = ResourceCollectionVSlots<T>['itemActions'] & {
    toggle: () => void
};

export function defineEntityPickerVProps<T extends RecordWithID = RecordWithID>() {
    return {
        value: {
            type: [Array, String] as PropType<string[] | string | null>,
        },
        multiple: {
            type: Boolean as PropType<boolean | undefined>,
        },
        ...defineResourceCollectionVProps<T>(),
    };
}

export const AEntityPicker = defineComponent({
    props: {
        componentName: {
            type: String,
            required: true,
        },
        ...defineEntityPickerVProps(),
    },
    emits: ['change'],
    setup(props, {
        emit, attrs, slots, expose,
    }) {
        const component = resolveComponent(props.componentName);
        const componentRef = ref(null) as Ref<null | Record<string, any>>;

        expose({
            load: (...args: any[]) => {
                if (componentRef.value) {
                    return componentRef.value.load(...args);
                }

                return undefined;
            },
        });

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

        const toggle = (id: string) => {
            const index = items.value!.indexOf(id);

            if (index === -1) {
                if (isMultiSelection.value) {
                    items.value!.push(id);
                } else {
                    items.value = [id];
                }
            } else if (isMultiSelection.value) {
                if (index !== -1) {
                    items.value!.splice(index, 1);
                }
            } else {
                items.value = [];
            }

            emit('change', [...items.value]);
        };

        return () => h(component, { ref: componentRef, ...props, ...attrs }, {
            [SlotName.HEADER]: (slotProps: ResourceCollectionVSlots<RecordWithID>['header']) => [
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
            [SlotName.FOOTER]: (slotProps: ResourceCollectionVSlots<RecordWithID>['footer']) => [
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
                slotProps: ResourceCollectionVSlots<RecordWithID>['itemActions'],
            ) => {
                let content : VNodeChild | undefined;
                if (hasNormalizedSlot(SlotName.ITEM_ACTIONS, slots)) {
                    content = normalizeSlot(SlotName.ITEM_ACTIONS, {
                        ...slotProps,
                        toggle,
                    }, slots);
                }

                if (content) {
                    return content;
                }

                return renderToggleButton({
                    value: items.value.indexOf(slotProps.data.id) !== -1,
                    isBusy: slotProps.busy,
                    changed() {
                        toggle(slotProps.data.id);
                    },
                });
            },
        });
    },
});
