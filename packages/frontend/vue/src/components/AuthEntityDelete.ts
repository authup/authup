/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { VNodeProperties } from '@vue-layout/utils';
import {
    DefineComponent,
    PropType,
    VNodeArrayChildren,
    VNodeProps,
    defineComponent,
    h,
    mergeProps,
    ref,
    resolveComponent,
} from 'vue';
import { useHTTPClientAPI } from '@authelion/common';
import { useHTTPClient } from '../utils';
import { useAuthIlingo } from '../language/singleton';

enum ElementType {
    BUTTON = 'button',
    LINK = 'link',
    DROP_DOWN_ITEM = 'dropDownItem',
}

export const AuthEntityDelete = defineComponent({
    name: 'AuthEntityDelete',
    props: {
        class: {
            type: String,
            default: '',
        },
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
            type: String,
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
        const modalRef = ref<null | DefineComponent>(null);

        const submit = async () => {
            if (busy.value) return;

            const domainApi = useHTTPClientAPI(useHTTPClient(), props.entityType);
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

        const show = async () => {
            if (!modalRef.value) {
                return;
            }

            modalRef.value.show();
        };

        const renderModal = () => {
            const modalComponent = resolveComponent('b-modal');

            let hint;
            if (props.hint) {
                hint = props.hint;
            } else {
                hint = useAuthIlingo()
                    .getSync('app.delete.hint', props.locale);
            }

            const message = h(
                'div',
                {
                    class: 'alert alert-sm alert-danger mb-0',
                },
                [hint],
            );

            return h(
                modalComponent,
                mergeProps({
                    ref: modalRef,
                    size: 'md',
                    buttonSize: 'xs',
                    okTitle: useAuthIlingo()
                        .getSync('app.delete.okTitle', props.locale),
                    cancelTitle: useAuthIlingo()
                        .getSync('app.delete.cancelTitle', props.locale),
                    onOk() {
                        return submit();
                    },
                    onCancel() {
                        ctx.emit('canceled');
                    },
                }, props.options),
                {
                    default: () => message,
                } as any,
            );
        };

        const render = () => {
            let tag = 'button';
            const data : VNodeProperties = {};

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
                    useAuthIlingo()
                        .getSync('app.delete.button', props.locale),
                ];
            }

            return [
                h(
                    tag,
                    mergeProps({
                        disabled: busy.value,
                        class: props.class,
                        onClick($event: any) {
                            $event.preventDefault();

                            return show.apply(null);
                        },
                    }, data),
                    [
                        icon,
                        text,
                    ],
                ),
                renderModal(),
            ];
        };

        return () => render();
    },
});

export default AuthEntityDelete;
