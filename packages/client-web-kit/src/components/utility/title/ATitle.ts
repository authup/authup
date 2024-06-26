/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType, SlotsType } from 'vue';
import { defineComponent } from 'vue';
import { TranslatorTranslationDefaultKey, TranslatorTranslationGroup, useTranslation } from '../../../core';
import type { TitleSlotProps } from './type';
import { buildTitle } from './module';

export const ATitle = defineComponent({
    props: {
        icon: {
            type: Boolean,
            default: true,
        },
        iconPosition: {
            type: String as PropType<'start' | 'end'>,
        },
        iconClass: {
            type: String,
        },
        text: {
            type: String,
        },
    },
    slots: Object as SlotsType<{
        default: TitleSlotProps
    }>,
    setup(props, { slots }) {
        const translation = useTranslation({
            group: TranslatorTranslationGroup.DEFAULT,
            key: TranslatorTranslationDefaultKey.OVERVIEW,
        });

        return () => buildTitle({
            slots,
            icon: props.icon,
            iconPosition: props.iconPosition,
            text: props.text || translation.value,
        });
    },
});
