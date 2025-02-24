/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ResourceType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Realm } from '@authup/core-kit';
import type { EntityCollectionVSlots } from '../../utility';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
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
    slots: Object as SlotsType<EntityCollectionVSlots<Realm>>,
    emits: defineEntityCollectionVEmitOptions<Realm>(),
    setup(props, ctx) {
        const { render } = defineEntityCollectionManager({
            type: `${ResourceType.REALM}`,
            props,
            setup: ctx,
        });

        const translationsName = useTranslation({
            group: TranslatorTranslationGroup.VUECS,
            key: TranslatorTranslationDefaultKey.REALMS,
        });

        const translation = useTranslation({
            group: TranslatorTranslationGroup.VUECS,
            key: TranslatorTranslationVuecsKey.NO_MORE,
            data: {
                name: translationsName,
            },
        });

        return () => render({
            noMore: {
                content: translation.value,
            },
        });
    },
});
