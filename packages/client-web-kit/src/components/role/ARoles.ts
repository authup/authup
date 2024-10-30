/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import type { SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { Role } from '@authup/core-kit';
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

export const ARoles = defineComponent({
    props: defineListProps<Role>(),
    slots: Object as SlotsType<ResourceCollectionVSlots<Role>>,
    emits: defineListEvents<Role>(),
    setup(props, ctx) {
        const { render } = createResourceCollectionManager({
            type: `${DomainType.ROLE}`,
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
