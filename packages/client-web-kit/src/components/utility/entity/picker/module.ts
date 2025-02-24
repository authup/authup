/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SlotName } from '@vuecs/list-controls';
import type {
    PropType, Ref, VNodeChild,
} from 'vue';
import {
    computed, h, mergeProps, ref, toRef, watch,
} from 'vue';
import { APagination } from '../../pagination';
import { renderToggleButton } from '../../toggle-button';
import type { EntityCollectionVSlots } from '../collection';
import { defineEntityCollectionVEmitOptions, defineEntityCollectionVProps } from '../collection';
import {
    hasNormalizedSlot, normalizeSlot,
} from '../../../../core';
import { ASearch } from '../../search';
import type { EntityPickerContext, EntityPickerVEmitOptions, RecordWithID } from './types';

export function defineEntityPickerVEmitOptions<T>() : EntityPickerVEmitOptions<T> {
    return {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        change: (_values: string[]) => true,
        ...defineEntityCollectionVEmitOptions<T>(),
    };
}

export function defineEntityPickerVProps<T extends RecordWithID = RecordWithID>() {
    return {
        value: {
            type: [Array, String] as PropType<string[] | string | null>,
        },
        multiple: {
            type: Boolean as PropType<boolean | undefined>,
        },
        ...defineEntityCollectionVProps<T>(),
    };
}

export function defineEntityPicker<T extends RecordWithID>({
    props,
    setup,
    component,
} : EntityPickerContext<T>) {
    const componentRef = ref(null) as Ref<null | Record<string, any>>;

    setup.expose({
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

        setup.emit('change', [...items.value]);
    };

    const render = () => h(
        component,
        mergeProps(
            { ref: componentRef },
            props,
            setup.attrs,
        ),
        {
            [SlotName.HEADER]: (slotProps: EntityCollectionVSlots<RecordWithID>['header']) => [
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
            [SlotName.FOOTER]: (slotProps: EntityCollectionVSlots<RecordWithID>['footer']) => [
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
                slotProps: EntityCollectionVSlots<RecordWithID>['itemActions'],
            ) => {
                let content : VNodeChild | undefined;
                if (hasNormalizedSlot(SlotName.ITEM_ACTIONS, setup.slots)) {
                    content = normalizeSlot(SlotName.ITEM_ACTIONS, {
                        ...slotProps,
                        toggle,
                    }, setup.slots);
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
        },
    );

    return {
        render,
    };
}
