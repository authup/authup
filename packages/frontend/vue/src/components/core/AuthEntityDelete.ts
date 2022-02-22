/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, {
    CreateElement, PropType, VNode, VNodeData,
} from 'vue';
import { BvMsgBoxData, BvMsgBoxOptions } from 'bootstrap-vue';
import { useDomainAPI } from '@typescript-auth/domains';
import { mergeDeep, useHTTPClient } from '../../utils';

enum ElementType {
    BUTTON = 'button',
    LINK = 'link',
    DROP_DOWN_ITEM = 'dropDownItem',
}

export type AuthEntityDeleteProperties = {
    [key: string]: any,
    elementIcon: string,
    elementText: string,
    elementType: `${ElementType}`,
    entityId: string,
    entityType: string,
    hint?: string
};

export const AuthEntityDelete = Vue.extend<
any,
any,
any,
AuthEntityDeleteProperties
>({
    props: {
        elementIcon: {
            type: String,
            default: 'fa-solid fa-trash',
        },
        elementText: {
            type: String,
            default: 'Drop',
        },
        elementType: {
            type: String as PropType<`${ElementType}`>,
            default: ElementType.BUTTON,
        },

        entityId: {
            type: String,
        },
        entityType: {
            type: String,
        },

        hint: {
            type: String,
            default: undefined,
        },
        options: {
            type: Object as PropType<BvMsgBoxOptions>,
            default: undefined,
        },
    },
    data() {
        return {
            busy: false,
        };
    },
    methods: {
        async delete() {
            if (this.busy) return;

            const domainApi = useDomainAPI(useHTTPClient(), this.entityType);
            if (!domainApi) {
                return;
            }

            this.busy = true;

            const h = this.$createElement;

            let { hint } = this;
            if (!hint) {
                hint = 'Are you sure, that you want to delete this entity?';
            }

            const message = h(
                'div',
                {
                    staticClass: 'alert alert-sm alert-danger mb-0',
                },
                [hint],
            );

            const confirmModal : Promise<BvMsgBoxData> = this.$bvModal.msgBoxConfirm(message, mergeDeep(
                {
                    size: 'md',
                    buttonSize: 'xs',
                },
                this.options || {},
            ));

            try {
                const value = await confirmModal;
                if (value) {
                    const response = await domainApi.delete(this.entityId);
                    response.id = this.entityId;
                    this.$emit('done', response);
                } else {
                    this.$emit('canceled');
                }
            } catch (e) {
                if (e instanceof Error) {
                    this.$emit('failed', e);
                }
            }

            this.busy = false;
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        let tag = 'button';
        const data : VNodeData = {};

        switch (vm.elementType) {
            case ElementType.LINK:
                tag = 'a';
                break;
            case ElementType.DROP_DOWN_ITEM:
                tag = 'b-dropdown-item';
                break;
        }

        let icon = h('');
        if (vm.elementIcon) {
            icon = h('i', {
                staticClass: vm.elementIcon,
                class: {
                    'pr-1': vm.elementText,
                },
            });
        }

        let text = h('');
        if (vm.elementText) {
            text = vm.elementText;
        }

        return h(tag, {
            on: {
                click($event: any) {
                    $event.preventDefault();

                    return vm.delete.apply(null);
                },
            },
            ...data,
        }, [
            icon,
            text,
        ]);
    },
});
