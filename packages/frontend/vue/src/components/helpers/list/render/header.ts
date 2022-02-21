/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { ComponentListData, ComponentListMethods, ComponentListProperties } from '../type';
import { hasNormalizedSlot, normalizeSlot } from '../../../utils/normalize-slot';
import { SlotName } from '../../../constants';

export type ListHeaderBuildContext = {
    title?: string,
    iconClass?: string,
};

export function buildListHeader<T extends Record<string, any>>(
    instance: ComponentListMethods<T> &
    ComponentListData<T> &
    ComponentListProperties<T> & {
        $scopedSlots: Record<string, any>,
        $slots: Record<string, any>
    },
    h: CreateElement,
    context?: ListHeaderBuildContext,
) : VNode {
    const $scopedSlots = instance.$scopedSlots || {};
    const $slots = instance.$slots || {};
    const slotScope = {};

    context = context || {};
    context.title = context.title || 'List';
    context.iconClass = context.iconClass || 'fa fa-bars';

    let header = h();
    if (instance.withHeader) {
        const hasHeaderTitleSlot = hasNormalizedSlot(SlotName.HEADER_TITLE, $scopedSlots, $slots);
        const headerTitleAlt = h('h6', {
            staticClass: 'mb-0',
        }, [
            h('i', { staticClass: context.iconClass }),
            ` ${context.title}`,
        ]);

        const headerTitle = hasHeaderTitleSlot ?
            normalizeSlot(SlotName.HEADER_TITLE, $scopedSlots, $slots) :
            headerTitleAlt;

        // -------------------------------------------------------------

        const hasHeaderActionsSlot = hasNormalizedSlot(SlotName.HEADER_ACTIONS, $scopedSlots, $slots);
        const headerActionsAlt = h(
            'div',
            {
                staticClass: 'd-flex flex-row',
            },
            [
                h('div', [
                    h('button', {
                        domProps: {
                            type: 'button',
                            disabled: instance.busy,
                        },
                        staticClass: 'btn btn-xs btn-dark',
                        on: {
                            click($event: Event) {
                                $event.preventDefault();

                                return instance.load.apply(null);
                            },
                        },
                    }, [
                        h('i', { staticClass: 'fa fa-sync' }),
                        ' refresh',
                    ]),
                ]),
            ],
        );

        const headerActions = hasHeaderActionsSlot ?
            normalizeSlot(SlotName.HEADER_ACTIONS, {
                load: instance.load,
                busy: instance.busy,
            }, $scopedSlots, $slots) :
            headerActionsAlt;

        // -------------------------------------------------------------

        const headerAlt = h(
            'div',
            {
                staticClass: 'd-flex flex-row mb-2 align-items-center',
            },
            [
                h('div', [headerTitle]),
                h('div', { staticClass: 'ml-auto' }, [headerActions]),
            ],
        );

        const hasHeaderSlot = hasNormalizedSlot(SlotName.HEADER, $scopedSlots, $slots);
        header = h(
            'div',
            {
                staticClass: 'list-header',
            },
            [hasHeaderSlot ?
                normalizeSlot(SlotName.HEADER, slotScope, $scopedSlots, $slots) :
                headerAlt,
            ],
        );
    }

    return header;
}
