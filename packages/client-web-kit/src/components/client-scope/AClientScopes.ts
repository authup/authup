/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { ClientScope } from '@authup/core-kit';
import type { ResourceCollectionVSlots } from '../../core';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    TranslatorTranslationVuecsKey,
    createResourceCollectionManager,
    defineListEvents,
    defineListProps,
    useTranslation,
} from '../../core';

export const AClientScopes = defineComponent({
    props: defineListProps<ClientScope>(),
    slots: Object as SlotsType<ResourceCollectionVSlots<ClientScope>>,
    emits: defineListEvents<ClientScope>(),
    setup(props, ctx) {
        const {
            render,
        } = createResourceCollectionManager({
            type: `${DomainType.CLIENT_SCOPE}`,
            props,
            setup: ctx,
        });

        const translationClientScopes = useTranslation({
            group: TranslatorTranslationGroup.DEFAULT,
            key: TranslatorTranslationDefaultKey.CLIENT_SCOPES,
        });

        const translation = useTranslation({
            group: TranslatorTranslationGroup.VUECS,
            key: TranslatorTranslationVuecsKey.NO_MORE,
            data: {
                name: translationClientScopes,
            },
        });

        return () => render({
            noMore: {
                content: translation.value,
            },
        });
    },
});

export default AClientScopes;
