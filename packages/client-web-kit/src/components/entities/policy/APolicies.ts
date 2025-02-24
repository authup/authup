/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { ResourceType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Policy } from '@authup/core-kit';
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

export const APolicies = defineComponent({
    props: defineEntityCollectionVProps<Policy>(),
    slots: Object as SlotsType<EntityCollectionVSlots<Policy>>,
    emits: defineEntityCollectionVEmitOptions<Policy>(),
    setup(props, setup) {
        const { render } = defineEntityCollectionManager({
            type: `${ResourceType.POLICY}`,
            props,
            setup,
        });

        const translationName = useTranslation({
            group: TranslatorTranslationGroup.DEFAULT,
            key: TranslatorTranslationDefaultKey.POLICIES,
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
