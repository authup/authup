/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Realm } from '@authup/core-kit';
import type { EntityCollectionVSlots } from '../../utility';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationNamespace,
    TranslatorTranslationVuecsKey,
    useTranslation,
} from '../../../core';
import {
    defineEntityCollectionManager,
    defineEntityCollectionVEmitOptions,
    defineEntityCollectionVProps,
} from '../../utility';

export const ARealms = defineComponent({
    props: defineEntityCollectionVProps<Realm>(),
    emits: defineEntityCollectionVEmitOptions<Realm>(),
    slots: Object as SlotsType<EntityCollectionVSlots<Realm>>,
    setup(props, ctx) {
        const { render } = defineEntityCollectionManager({
            type: `${EntityType.REALM}`,
            props,
            setup: ctx,
        });

        const translationsName = useTranslation({
            namespace: TranslatorTranslationNamespace.DEFAULT,
            key: TranslatorTranslationDefaultKey.REALMS,
        });

        const translation = useTranslation({
            namespace: TranslatorTranslationNamespace.VUECS,
            key: TranslatorTranslationVuecsKey.NO_MORE,
            data: { name: translationsName },
        });

        return () => render({ noMore: { content: translation.value } });
    },
});
