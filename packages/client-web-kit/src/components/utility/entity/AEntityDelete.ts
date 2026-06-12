/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type {
    Component,
    PropType,
    VNodeArrayChildren,
    VNodeProps,
} from 'vue';
import {
    defineComponent, 
    getCurrentInstance,
    h,
    mergeProps,
    ref, 
    resolveDynamicComponent,
} from 'vue';
import type { EntityType } from '@authup/core-kit';
import type { IEntityAPISlim } from '@authup/core-http-kit';
import { TranslatorTranslationActionKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { injectHTTPClient, useTranslation, wrapFnWithBusyState } from '../../../core';

enum ElementType {
    BUTTON = 'button',
    LINK = 'link',
    DROP_DOWN_ITEM = 'dropDownItem',
}

const AEntityDelete = defineComponent({
    props: {
        elementIcon: {
            type: String,
            default: 'fa6-solid:trash',
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
            type: String as PropType<`${EntityType}`>,
            required: true,
        },

        hint: {
            type: String,
            default: undefined,
        },
    },
    emits: ['deleted', 'failed'],
    setup(props, ctx) {
        const apiClient = injectHTTPClient();
        const instance = getCurrentInstance();
        const busy = ref(false);

        const submit = wrapFnWithBusyState(busy, async () => {
            const domainAPI = (
                apiClient as Record<string, any>
            )[props.entityType] as IEntityAPISlim<any> | undefined;

            if (!isObject(domainAPI)) {
                return;
            }

            if (typeof domainAPI.delete !== 'function') {
                return;
            }

            try {
                const response = await domainAPI.delete(props.entityId);
                response.id = props.entityId;
                ctx.emit('deleted', response);
            } catch (e) {
                ctx.emit('failed', e);
            }
        });

        const translation = useTranslation({
            namespace: TranslatorTranslationNamespace.ACTION,
            key: TranslatorTranslationActionKey.DELETE,
        });

        const render = () => {
            let tag : Component | string = 'button';
            const data : VNodeProps = {};

            switch (props.elementType) {
                case ElementType.LINK:
                    tag = 'a';
                    break;
                case ElementType.DROP_DOWN_ITEM:
                    if (
                        instance &&
                        typeof instance.appContext.app.component('VCDropdownMenuItem') !== 'undefined'
                    ) {
                        tag = resolveDynamicComponent('VCDropdownMenuItem') as Component;
                    }
                    break;
            }

            let icon : VNodeArrayChildren = [];
            if (props.elementIcon) {
                icon = [
                    h(resolveDynamicComponent('VCIcon') as Component, {
                        name: props.elementIcon,
                        class: props.withText ? 'pe-1' : undefined,
                    }),
                ];
            }

            let text : VNodeArrayChildren = [];
            if (props.withText) {
                text = [
                    translation.value,
                ];
            }

            return h(
                tag as string,
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

export { AEntityDelete };
