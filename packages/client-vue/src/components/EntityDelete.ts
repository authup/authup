/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    PropType,
    VNodeArrayChildren,
    VNodeProps,
} from 'vue';
import {
    defineComponent,
    h,
    mergeProps,
    ref,
} from 'vue';
import type { DomainType } from '@authup/core';
import { useDomainAPI } from '@authup/core';
import { useAPIClient } from '../core';
import { useTranslator } from '../language';

enum ElementType {
    BUTTON = 'button',
    LINK = 'link',
    DROP_DOWN_ITEM = 'dropDownItem',
}

export const EntityDelete = defineComponent({
    name: 'EntityDelete',
    props: {
        elementIcon: {
            type: String,
            default: 'fa-solid fa-trash',
        },
        withText: {
            type: Boolean,
            default: true,
        },
        elementType: {
            type: String as PropType<`${ElementType}`>,
            default: ElementType.BUTTON,
        },

        entityId: {
            type: String,
            required: true,
        },
        entityType: {
            type: String as PropType<`${DomainType}`>,
            required: true,
        },

        hint: {
            type: String,
            default: undefined,
        },
        locale: {
            type: String,
            default: undefined,
        },
        options: {
            type: Object as PropType<VNodeProps>,
            default: () => ({}),
        },
    },
    emits: ['canceled', 'deleted', 'failed'],
    setup(props, ctx) {
        const busy = ref(false);

        const submit = async () => {
            if (busy.value) return;

            const domainApi = useDomainAPI(useAPIClient(), props.entityType);
            if (!domainApi) {
                return;
            }

            busy.value = true;

            try {
                const response = await domainApi.delete(props.entityId);
                response.id = props.entityId;
                ctx.emit('deleted', response);
            } catch (e) {
                ctx.emit('failed', e);
            }

            busy.value = false;
        };

        const render = () => {
            let tag = 'button';
            const data : VNodeProps = {};

            switch (props.elementType) {
                case ElementType.LINK:
                    tag = 'a';
                    break;
                case ElementType.DROP_DOWN_ITEM:
                    tag = 'b-dropdown-item';
                    break;
            }

            let icon : VNodeArrayChildren = [];
            if (props.elementIcon) {
                icon = [
                    h('i', {
                        class: [props.elementIcon, {
                            'pr-1': props.withText,
                        }],
                    }),
                ];
            }

            let text : VNodeArrayChildren = [];
            if (props.withText) {
                text = [
                    useTranslator()
                        .getSync('app.delete.button', props.locale),
                ];
            }

            return h(
                tag,
                mergeProps({
                    disabled: busy.value,
                    onClick($event: any) {
                        $event.preventDefault();

                        return submit.apply(null);
                    },
                }, data),
                [
                    icon,
                    text,
                ],
            );
        };

        return () => render();
    },
});

export default EntityDelete;
