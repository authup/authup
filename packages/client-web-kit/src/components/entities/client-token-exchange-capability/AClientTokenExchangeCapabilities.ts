/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { ClientTokenExchangeCapability } from '@authup/core-kit';
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

export const AClientTokenExchangeCapabilities = defineComponent({
    props: {
        ...defineEntityCollectionVProps<ClientTokenExchangeCapability>(),
        clientId: {
            type: String,
            default: undefined,
        },
    },
    emits: defineEntityCollectionVEmitOptions<ClientTokenExchangeCapability>(),
    slots: Object as SlotsType<EntityCollectionVSlots<ClientTokenExchangeCapability>>,
    setup(props, ctx) {
        const { render } = defineEntityCollectionManager({
            type: `${EntityType.CLIENT_TOKEN_EXCHANGE_CAPABILITY}`,
            props,
            setup: ctx,
            // The channel carries the capabilities of every client.
            socket: {
                processEvent(event) {
                    return !props.clientId || event.data.clientId === props.clientId;
                },
            },
        });

        const translationName = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.CLIENT_TOKEN_EXCHANGE_CAPABILITY,
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

export default AClientTokenExchangeCapabilities;
