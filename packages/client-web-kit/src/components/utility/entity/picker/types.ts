/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Component, SetupContext, SlotsType } from 'vue';
import type {
    EntityCollectionVEmitOptions,
    EntityCollectionVProps,
    EntityCollectionVSlots,
} from '../collection';

export type RecordWithID = {
    id: string,
    [key: string]: any
};
export type EntityPickerVSlots<
    T extends RecordWithID = RecordWithID,
> = {
    [K in keyof EntityCollectionVSlots<T>]: EntityCollectionVSlots<T>[K] & {
        toggle: () => void
    }
};
export type EntityPickerVEmitOptions<T> = {
    change: (values: string[]) => true
} & EntityCollectionVEmitOptions<T>;

export type EntityPickerVProps<T> = {
    value?: string[] | string | null,
    multiple?: boolean
} & EntityCollectionVProps<T>;

export type EntityPickerContext<T extends RecordWithID> = {
    props: EntityPickerVProps<T>,
    setup: SetupContext<
    EntityPickerVEmitOptions<T>,
    SlotsType<EntityPickerVSlots<T>>
    >,
    /**
     * Resource collection component.
     */
    component: Component | string
};
