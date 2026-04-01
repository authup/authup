/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { VNodeChild } from 'vue';
import { h } from 'vue';
import { hasNormalizedSlot, normalizeSlot } from '../../../core';
import { TitleSlotName } from './constants';
import type { TitleOptions } from './type';

export function buildTitle(
    ctx: TitleOptions,
) {
    ctx.tag = ctx.tag || 'h6';
    ctx.icon = ctx.icon ?? true;
    ctx.iconClass = ctx.iconClass || 'fa-solid fa-list';
    ctx.iconPosition = ctx.iconPosition ?? 'start';

    if (hasNormalizedSlot(TitleSlotName.DEFAULT, ctx.slots)) {
        return normalizeSlot(TitleSlotName.DEFAULT, {
            tag: ctx.tag,
            icon: ctx.icon,
            iconClass: ctx.iconClass,
            iconPosition: ctx.iconPosition,
        }, ctx.slots);
    }

    let icon: VNodeChild;

    if (ctx.icon) {
        let iconContent : VNodeChild;
        if (hasNormalizedSlot(TitleSlotName.ICON)) {
            iconContent = normalizeSlot(TitleSlotName.ICON, {}, ctx.slots);
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
