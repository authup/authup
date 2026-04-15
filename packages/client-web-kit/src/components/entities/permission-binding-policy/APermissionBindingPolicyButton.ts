/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityTypeMap, PermissionRelation } from '@authup/core-kit';
import type { PropType } from 'vue';
import {
    Teleport,
    defineComponent,
    h,
    ref,
    toRef,
    watch,
} from 'vue';
import { SlotName } from '@vuecs/list-controls';
import { hasOwnProperty } from '@authup/kit';
import { injectHTTPClient } from '../../../core';
import { APolicies } from '../policy/APolicies';

type PermissionBindingEntity = PermissionRelation & { id: string };

export const APermissionBindingPolicyButton = defineComponent({
    props: {
        entityType: {
            type: String as PropType<keyof EntityTypeMap>,
            required: true,
        },
        entity: {
            type: Object as PropType<PermissionBindingEntity>,
            required: true,
        },
    },
    emits: ['updated'],
    setup(props, { emit }) {
        const client = injectHTTPClient();

        const modalOpen = ref(false);
        const busy = ref(false);
        const currentPolicyId = ref<string | null>(props.entity.policy_id);

        const entityRef = toRef(props, 'entity');
        watch(entityRef, (val) => {
            currentPolicyId.value = val.policy_id;
        }, { deep: true });

        const handlePolicySelect = async (policyId: string | null) => {
            if (busy.value) return;

            const api = hasOwnProperty(client, props.entityType) ?
                client[props.entityType] as any :
                undefined;

            if (!api || !api.update) return;

            busy.value = true;
            try {
                const response = await api.update(props.entity.id, { policy_id: policyId });
                currentPolicyId.value = policyId;
                emit('updated', response);
                modalOpen.value = false;
            } finally {
                busy.value = false;
            }
        };

        return () => {
            const children = [];

            children.push(h('button', {
                class: ['btn btn-xs', {
                    'btn-dark': busy.value,
                    'btn-primary': !busy.value && currentPolicyId.value,
                    'btn-secondary': !busy.value && !currentPolicyId.value,
                }],
                disabled: busy.value,
                onClick(e: Event) {
                    e.preventDefault();
                    modalOpen.value = true;
                },
            }, [
                h('i', { class: 'fa fa-cog' }),
            ]));

            if (modalOpen.value) {
                const backdrop = h('div', {
                    class: 'modal-backdrop fade show',
                    onClick() {
                        modalOpen.value = false;
                    },
                });

                const modal = h('div', {
                    class: 'modal fade show d-block',
                    tabindex: '-1',
                    role: 'dialog',
                }, [
                    h('div', {
                        class: 'modal-dialog',
                        role: 'document',
                        onClick(e: Event) {
                            e.stopPropagation();
                        },
                    }, [
                        h('div', { class: 'modal-content' }, [
                            h('div', { class: 'modal-header' }, [
                                h('h5', { class: 'modal-title' }, 'Junction Policy'),
                                h('button', {
                                    type: 'button',
                                    class: 'btn-close',
                                    onClick() {
                                        modalOpen.value = false;
                                    },
                                }),
                            ]),
                            h('div', { class: 'modal-body' }, [
                                h(APolicies, { query: { filters: { parent_id: null } } }, {
                                    [SlotName.ITEM_ACTIONS]: (slotProps: { data: { id: string } }) => {
                                        const isSelected = currentPolicyId.value === slotProps.data.id;
                                        return h('button', {
                                            class: ['btn btn-xs', {
                                                'btn-dark': busy.value,
                                                'btn-success': !busy.value && isSelected,
                                                'btn-secondary': !busy.value && !isSelected,
                                            }],
                                            disabled: busy.value,
                                            onClick(e: Event) {
                                                e.preventDefault();
                                                if (isSelected) {
                                                    handlePolicySelect(null);
                                                } else {
                                                    handlePolicySelect(slotProps.data.id);
                                                }
                                            },
                                        }, [
                                            h('i', {
                                                class: ['fa', {
                                                    'fa-check': isSelected,
                                                    'fa-plus': !isSelected,
                                                }],
                                            }),
                                        ]);
                                    },
                                }),
                            ]),
                            h('div', { class: 'modal-footer' }, [
                                currentPolicyId.value ?
                                    h('button', {
                                        type: 'button',
                                        class: 'btn btn-warning btn-xs',
                                        disabled: busy.value,
                                        onClick() {
                                            handlePolicySelect(null);
                                        },
                                    }, 'Clear Policy') :
                                    undefined,
                                h('button', {
                                    type: 'button',
                                    class: 'btn btn-secondary btn-xs',
                                    onClick() {
                                        modalOpen.value = false;
                                    },
                                }, 'Close'),
                            ]),
                        ]),
                    ]),
                ]);

                children.push(h(Teleport, { to: 'body' }, [backdrop, modal]));
            }

            return h('span', children);
        };
    },
});
