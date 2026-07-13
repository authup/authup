/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { Consent } from '@authup/core-kit';
import { TranslatorTranslationEntityKey, TranslatorTranslationNamespace, TranslatorTranslationVuecsKey } from '@authup/i18n';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import { useTranslation } from '../../../core';
import type { EntityCollectionVSlots } from '../../utility';
import {
    defineEntityCollectionManager,
    defineEntityCollectionVEmitOptions,
    defineEntityCollectionVProps,
} from '../../utility';

export const AConsents = defineComponent({
    props: defineEntityCollectionVProps<Consent>(),
    emits: defineEntityCollectionVEmitOptions<Consent>(),
    slots: Object as SlotsType<EntityCollectionVSlots<Consent>>,
    setup(props, ctx) {
        const { render } = defineEntityCollectionManager({
            type: `${EntityType.CONSENT}`,
            props,
            setup: ctx,
        });

        const translationName = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.CONSENT,
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

export default AConsents;
