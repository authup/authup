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
} from 'vue';
import {
    defineComponent,
    getCurrentInstance,
    h,
    mergeProps,
    ref,
    resolveDynamicComponent,
} from 'vue';
import type { ButtonSize } from '@vuecs/button';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import type { EntityType } from '@authup/core-kit';
import type { IEntityAPISlim } from '@authup/core-http-kit';
import { TranslatorTranslationActionKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { 
    DEFAULT_BUTTON_SIZE, 
    injectHTTPClient, 
    useTranslation, 
    wrapFnWithBusyState, 
} from '../../../core';

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

        disabled: {
            type: Boolean,
            default: false,
        },

        hint: {
            type: String,
            default: undefined,
        },
        size: {
            type: String as PropType<ButtonSize>,
            default: DEFAULT_BUTTON_SIZE,
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

        const onClick = ($event: any) => {
            $event.preventDefault();

            return submit.apply(null);
        };

        const render = () => {
            const isDisabled = busy.value || props.disabled;

            // Default button form: a danger-outline <VCButton>. The delete
            // action is inherently destructive, so the styling is baked in
            // rather than passed per call site (was `btn btn-xs btn-outline-danger`).
            if (props.elementType === ElementType.BUTTON) {
                return h(
                    VCButton,
                    {
                        size: props.size,
                        color: 'error',
                        variant: 'outline',
                        label: props.withText ? translation.value : undefined,
                        disabled: isDisabled,
                        onClick,
                    },
                    props.elementIcon ?
                        { leading: () => h(VCIcon, { name: props.elementIcon }) } :
                        undefined,
                );
            }

            let tag : Component | string = 'a';
            if (props.elementType === ElementType.DROP_DOWN_ITEM) {
                if (
                    instance &&
                    typeof instance.appContext.app.component('VCDropdownMenuItem') !== 'undefined'
                ) {
                    tag = resolveDynamicComponent('VCDropdownMenuItem') as Component;
                }
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
                    disabled: isDisabled,
                    onClick,
                }),
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
