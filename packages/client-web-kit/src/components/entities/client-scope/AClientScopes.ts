/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { ClientScope } from '@authup/core-kit';
import type { EntityCollectionVSlots } from '../../utility';
import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace, TranslatorTranslationVuecsKey } from '@authup/i18n';
import { useTranslation } from '../../../core';
import {
    defineEntityCollectionManager,
    defineEntityCollectionVEmitOptions,
    defineEntityCollectionVProps,
} from '../../utility';

export const AClientScopes = defineComponent({
    props: defineEntityCollectionVProps<ClientScope>(),
    emits: defineEntityCollectionVEmitOptions<ClientScope>(),
    slots: Object as SlotsType<EntityCollectionVSlots<ClientScope>>,
    setup(props, ctx) {
        const { render } = defineEntityCollectionManager({
            type: `${EntityType.CLIENT_SCOPE}`,
            props,
            setup: ctx,
        });

        const translationClientScopes = useTranslation({
            namespace: TranslatorTranslationNamespace.FIELD,
            key: TranslatorTranslationFieldKey.CLIENT_SCOPES,
        });

        const translation = useTranslation({
            namespace: TranslatorTranslationNamespace.VUECS,
            key: TranslatorTranslationVuecsKey.NO_MORE,
            data: { name: translationClientScopes },
        });

        return () => render({ noMore: { content: translation.value } });
    },
});

export default AClientScopes;
