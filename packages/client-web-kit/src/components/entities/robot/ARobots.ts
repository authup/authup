/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Robot } from '@authup/core-kit';
import type { EntityCollectionVSlots } from '../../utility';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup, TranslatorTranslationVuecsKey, useTranslation,
} from '../../../core';
import {
    defineEntityCollectionManager,
    defineEntityCollectionVEmitOptions,
    defineEntityCollectionVProps,
} from '../../utility';

export const ARobots = defineComponent({
    props: defineEntityCollectionVProps<Robot>(),
    emits: defineEntityCollectionVEmitOptions<Robot>(),
    slots: Object as SlotsType<EntityCollectionVSlots<Robot>>,
    setup(props, ctx) {
        const { render } = defineEntityCollectionManager({
            type: `${EntityType.ROBOT}`,
            props,
            setup: ctx,
        });

        const translationName = useTranslation({
            group: TranslatorTranslationGroup.VUECS,
            key: TranslatorTranslationDefaultKey.ROBOTS,
        });

        const translation = useTranslation({
            group: TranslatorTranslationGroup.VUECS,
            key: TranslatorTranslationVuecsKey.NO_MORE,
            data: {
                name: translationName,
            },
        });

        return () => render({
            noMore: {
                content: translation.value,
            },
        });
    },
});
