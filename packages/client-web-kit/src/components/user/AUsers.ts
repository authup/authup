/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ResourceType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { User } from '@authup/core-kit';
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

export const AUsers = defineComponent({
    props: defineResourceCollectionVProps<User>(),
    slots: Object as SlotsType<ResourceCollectionVSlots<User>>,
    emits: defineResourceCollectionVEmitOptions<User>(),
    setup(props, ctx) {
        const { render } = createResourceCollectionManager({
            type: `${ResourceType.USER}`,
            props,
            setup: ctx,
        });

        const translationName = useTranslation({
            group: TranslatorTranslationGroup.DEFAULT,
            key: TranslatorTranslationDefaultKey.USERS,
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

export default AUsers;
