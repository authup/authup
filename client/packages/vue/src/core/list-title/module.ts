/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { VNodeChild } from 'vue';
import { h } from 'vue';
import { hasNormalizedSlot, normalizeSlot } from '../slot';
import { ListTitleSlotName } from './constants';
import type { ListTitleOptions } from './type';

export function buildListTitle(
    ctx: ListTitleOptions,
) {
    ctx.tag = ctx.tag || 'h6';
    ctx.icon = ctx.icon ?? true;
    ctx.iconClass = ctx.iconClass || 'fa-solid fa-list';
    ctx.iconPosition = ctx.iconPosition ?? 'start';

    if (hasNormalizedSlot(ListTitleSlotName.DEFAULT, ctx.slots)) {
        return normalizeSlot(ListTitleSlotName.DEFAULT, {
            tag: ctx.tag,
            icon: ctx.icon,
            iconClass: ctx.iconClass,
            iconPosition: ctx.iconPosition,
        }, ctx.slots);
    }

    let icon: VNodeChild;

    if (ctx.icon) {
        let iconContent : VNodeChild;
        if (hasNormalizedSlot(ListTitleSlotName.ICON)) {
            iconContent = normalizeSlot(ListTitleSlotName.ICON, {}, ctx.slots);
        }

        if (iconContent) {
            icon = iconContent;
        } else {
            icon = h(
                'i',
                { class: [ctx.iconClass, 'pe-1'] },
            );
        }
    }

    let content: VNodeChild;
    if (typeof ctx.text === 'function') {
        content = ctx.text();
    } else {
        content = ctx.text || 'Overview';
    }

    if (ctx.iconPosition === 'start') {
        return h(ctx.tag, [
            icon,
            content,
        ]);
    }

    return h(ctx.tag, [
        content,
        icon,
    ]);
}
