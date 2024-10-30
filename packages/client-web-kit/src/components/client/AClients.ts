/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Client } from '@authup/core-kit';
import type { ResourceCollectionVSlots } from '../../core';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup, TranslatorTranslationVuecsKey, createResourceCollectionManager,
    defineResourceCollectionVEmitOptions, defineResourceCollectionVProps, useTranslation,
} from '../../core';

export const AClients = defineComponent({
    props: defineResourceCollectionVProps<Client>(),
    slots: Object as SlotsType<ResourceCollectionVSlots<Client>>,
    emits: defineResourceCollectionVEmitOptions<Client>(),
    setup(props, ctx) {
        const { render } = createResourceCollectionManager({
            type: `${DomainType.CLIENT}`,
            props,
            setup: ctx,
        });

        const translationName = useTranslation({
            group: TranslatorTranslationGroup.DEFAULT,
            key: TranslatorTranslationDefaultKey.CLIENTS,
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

export default AClients;
