/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Client } from '@authup/core-kit';
import type { EntityCollectionVSlots } from '../../utility';
import {
    defineEntityCollectionManager,
    defineEntityCollectionVEmitOptions,
    defineEntityCollectionVProps,
} from '../../utility';
import {
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
    TranslatorTranslationVuecsKey,
    useTranslation,
} from '../../../core';

export const AClients = defineComponent({
    props: defineEntityCollectionVProps<Client>(),
    emits: defineEntityCollectionVEmitOptions<Client>(),
    slots: Object as SlotsType<EntityCollectionVSlots<Client>>,
    setup(props, ctx) {
        const { render } = defineEntityCollectionManager({
            type: `${EntityType.CLIENT}`,
            props,
            setup: ctx,
        });

        const translationName = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.CLIENT,
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

export default AClients;
