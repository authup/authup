/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Component, SetupContext, SlotsType } from 'vue';
import type {
    ResourceCollectionVEmitOptions,
    ResourceCollectionVProps,
    ResourceCollectionVSlots,
} from '../collection';

export type RecordWithID = {
    id: string,
    [key: string]: any
};
export type ResourcePickerVSlots<
    T extends RecordWithID = RecordWithID,
> = {
    [K in keyof ResourceCollectionVSlots<T>]: ResourceCollectionVSlots<T>[K] & {
        toggle: () => void
    }
};
export type ResourcePickerVEmitOptions<T> = {
    change: (values: string[]) => true
} & ResourceCollectionVEmitOptions<T>;

export type ResourcePickerVProps<T> = {
    value?: string[] | string | null,
    multiple?: boolean
} & ResourceCollectionVProps<T>;

export type ResourcePickerContext<T extends RecordWithID> = {
    props: ResourcePickerVProps<T>,
    setup: SetupContext<
    ResourcePickerVEmitOptions<T>,
    SlotsType<ResourcePickerVSlots<T>>
    >,
    /**
     * Resource collection component.
     */
    component: Component | string
};
