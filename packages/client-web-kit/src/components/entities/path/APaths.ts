/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { Path } from '@authup/core-kit';
import { TranslatorTranslationEntityKey, TranslatorTranslationNamespace, TranslatorTranslationVuecsKey } from '@authup/i18n';
import { contains, or } from '@rapiq/core';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import { useTranslation } from '../../../core';
import type { EntityCollectionVSlots } from '../../utility';
import {
    defineEntityCollectionManager,
    defineEntityCollectionVEmitOptions,
    defineEntityCollectionVProps,
} from '../../utility';

export const APaths = defineComponent({
    props: defineEntityCollectionVProps<Path>(),
    emits: defineEntityCollectionVEmitOptions<Path>(),
    slots: Object as SlotsType<EntityCollectionVSlots<Path>>,
    setup(props, ctx) {
        const { render } = defineEntityCollectionManager({
            type: `${EntityType.PATH}`,
            props,
            setup: ctx,
            // The path schema deliberately allows no filter on `name`: the
            // segment leads no index, and rapiq answers an unknown filter
            // key with `keyNotAllowed` (400) rather than pruning it, so the
            // default `name` search would fail every request. A folder is
            // identified by its full derived path anyway, which is what a
            // reader types.
            queryFilters: (value: string) => or(
                contains('path', value),
                contains('displayName', value),
            ),
        });

        const translationName = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.PATH,
            count: 2,
        });

        const translation = useTranslation({
            namespace: TranslatorTranslationNamespace.VUECS,
            key: TranslatorTranslationVuecsKey.NO_MORE,
            data: { name: translationName },
        });

        return () => render({ noMore: { content: translation.value } });
    },
});

export default APaths;
