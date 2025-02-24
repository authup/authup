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
import type { ResourceCollectionVSlots } from '../utility';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    TranslatorTranslationVuecsKey,
    useTranslation,
} from '../../core';
import {
    createResourceCollectionManager,
    defineResourceCollectionVEmitOptions,
    defineResourceCollectionVProps,
} from '../utility';

export const ARealms = defineComponent({
    props: defineResourceCollectionVProps<Realm>(),
    slots: Object as SlotsType<ResourceCollectionVSlots<Realm>>,
    emits: defineResourceCollectionVEmitOptions<Realm>(),
    setup(props, ctx) {
        const { render } = createResourceCollectionManager({
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
