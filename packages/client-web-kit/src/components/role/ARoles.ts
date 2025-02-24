/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ResourceType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Role } from '@authup/core-kit';
import type { ResourceCollectionVSlots } from '../utility';
import {
    createResourceCollectionManager,
    defineResourceCollectionVEmitOptions,
    defineResourceCollectionVProps,
} from '../utility';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    TranslatorTranslationVuecsKey,
    useTranslation,
} from '../../core';

export const ARoles = defineComponent({
    props: defineResourceCollectionVProps<Role>(),
    slots: Object as SlotsType<ResourceCollectionVSlots<Role>>,
    emits: defineResourceCollectionVEmitOptions<Role>(),
    setup(props, ctx) {
        const { render } = createResourceCollectionManager({
            type: `${ResourceType.ROLE}`,
            props,
            setup: ctx,
        });

        const translationName = useTranslation({
            group: TranslatorTranslationGroup.VUECS,
            key: TranslatorTranslationDefaultKey.ROLES,
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

export default ARoles;
