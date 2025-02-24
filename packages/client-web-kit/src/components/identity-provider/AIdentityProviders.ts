/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ResourceType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { IdentityProvider } from '@authup/core-kit';
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

export const AIdentityProviders = defineComponent({
    props: defineResourceCollectionVProps<IdentityProvider>(),
    slots: Object as SlotsType<ResourceCollectionVSlots<IdentityProvider>>,
    emits: defineResourceCollectionVEmitOptions<IdentityProvider>(),
    setup(props, ctx) {
        const { render } = createResourceCollectionManager({
            type: `${ResourceType.IDENTITY_PROVIDER}`,
            props,
            setup: ctx,
        });

        const translationName = useTranslation({
            group: TranslatorTranslationGroup.DEFAULT,
            key: TranslatorTranslationDefaultKey.IDENTITY_PROVIDERS,
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

export default AIdentityProviders;
