/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityTypeMap, PermissionRelation, Policy } from '@authup/core-kit';
import type { PropType } from 'vue';
import {
    Teleport,
    defineComponent,
    h,
    onMounted,
    onUnmounted,
    ref,
    toRef,
    watch,
} from 'vue';
import { SlotName } from '@vuecs/list-controls';
import { hasOwnProperty } from '@authup/kit';
import { injectHTTPClient } from '../../../core';
import { APolicies } from '../policy/APolicies';
import { APolicyInlineInfo } from '../policy/APolicyInlineInfo';
import { APolicySummary } from '../policy/APolicySummary';

type PermissionBindingEntity = PermissionRelation & { id: string };

export const APermissionPolicyBindingButton = defineComponent({
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
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        const client = injectHTTPClient();

        const modalOpen = ref(false);
        const busy = ref(false);
        const currentPolicyId = ref<string | null>(props.entity.policy_id);
        const detailPolicy = ref<Policy | null>(null);

        const entityRef = toRef(props, 'entity');
        watch(entityRef, (val) => {
            currentPolicyId.value = val.policy_id;
        }, { deep: true });

        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (detailPolicy.value) {
                    detailPolicy.value = null;
                } else if (modalOpen.value) {
                    modalOpen.value = false;
                }
            }
        };

        onMounted(() => {
            document.addEventListener('keydown', handleKeydown);
        });

        onUnmounted(() => {
            document.removeEventListener('keydown', handleKeydown);
        });

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
            } catch (e) {
                if (e instanceof Error) {
                    emit('failed', e);
                }
            } finally {
                busy.value = false;
            }
        };

        const modalTitleId = `policy-modal-title-${props.entity.id}`;

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
                        if (detailPolicy.value) {
                            detailPolicy.value = null;
                        } else {
                            modalOpen.value = false;
                        }
                    },
                });

                let modalTitle: string;
                let modalBody;
                let modalFooter;

                if (detailPolicy.value) {
                    const policy = detailPolicy.value;
                    modalTitle = policy.name;
                    modalBody = h(APolicySummary, { entity: policy });
                    modalFooter = [
                        h('button', {
                            type: 'button',
                            class: 'btn btn-outline-secondary btn-xs',
                            onClick() {
                                detailPolicy.value = null;
                            },
                        }, [
                            h('i', { class: 'fa fa-arrow-left me-1' }),
                            'Back',
                        ]),
                    ];
                } else {
                    modalTitle = 'Junction Policy';
                    modalBody = h(APolicies, { query: { filters: { parent_id: null } } }, {
                        [SlotName.ITEM]: (slotProps: { data: Policy }) => {
                            const isSelected = currentPolicyId.value === slotProps.data.id;

                            return [
                                h('div', [slotProps.data.name]),
                                h(APolicyInlineInfo, {
                                    entity: slotProps.data,
                                    onDetail: (policy: Policy) => {
                                        detailPolicy.value = policy;
                                    },
                                }),
                                h('div', { class: 'ms-auto' }, [
                                    h('button', {
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
                                    ]),
                                ]),
                            ];
                        },
                    });
                    modalFooter = [
                        currentPolicyId.value ?
                            h('button', {
                                type: 'button',
                                class: 'btn btn-warning btn-xs',
                                disabled: busy.value,
                                onClick() {
                                    handlePolicySelect(null);
                                },
                            }, 'Reset') :
                            undefined,
                        h('button', {
                            type: 'button',
                            class: 'btn btn-secondary btn-xs',
                            onClick() {
                                modalOpen.value = false;
                            },
                        }, 'Close'),
                    ];
                }

                const modal = h('div', {
                    class: 'modal fade show d-block',
                    tabindex: '-1',
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-labelledby': modalTitleId,
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
                                h('h5', { class: 'modal-title', id: modalTitleId }, modalTitle),
                                h('button', {
                                    type: 'button',
                                    class: 'btn-close',
                                    'aria-label': 'Close',
                                    onClick() {
                                        if (detailPolicy.value) {
                                            detailPolicy.value = null;
                                        } else {
                                            modalOpen.value = false;
                                        }
                                    },
                                }),
                            ]),
                            h('div', { class: 'modal-body' }, [modalBody]),
                            h('div', { class: 'modal-footer' }, modalFooter),
                        ]),
                    ]),
                ]);

                children.push(h(Teleport, { to: 'body' }, [backdrop, modal]));
            }

            return h('span', children);
        };
    },
});
