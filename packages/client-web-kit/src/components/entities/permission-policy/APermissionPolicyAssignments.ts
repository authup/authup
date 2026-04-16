/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Teleport,
    defineComponent,
    h,
    onMounted,
    onUnmounted,
    ref,
} from 'vue';
import type { Policy } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import { APermissionPolicyAssignment } from './APermissionPolicyAssignment';
import { APolicies } from '../policy';
import { APolicyDetailNav } from '../policy/APolicyDetailNav';
import { APolicySummary } from '../policy/APolicySummary';
import { APolicyTypeBadge } from '../policy/APolicyTypeBadge';

export const APermissionPolicyAssignments = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        const detailPolicy = ref<Policy | null>(null);

        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && detailPolicy.value) {
                detailPolicy.value = null;
            }
        };

        onMounted(() => {
            document.addEventListener('keydown', handleKeydown);
        });

        onUnmounted(() => {
            document.removeEventListener('keydown', handleKeydown);
        });

        return () => {
            const children = [
                h(APolicies, { query: { filters: { parent_id: null } } }, {
                    [SlotName.ITEM]: (slotProps: { data: Policy }) => {
                        const badges = [
                            h(APolicyTypeBadge, { type: slotProps.data.type }),
                        ];
                        if (slotProps.data.invert) {
                            badges.push(h('span', { class: 'badge bg-warning' }, 'Inverted'));
                        }

                        return [
                            h('div', [slotProps.data.name]),
                            ...badges,
                            h('div', { class: 'ms-auto d-flex align-items-center gap-1' }, [
                                h(APolicyDetailNav, {
                                    policyId: slotProps.data.id,
                                    onClick: () => {
                                        detailPolicy.value = slotProps.data;
                                    },
                                }),
                                h(APermissionPolicyAssignment, {
                                    permissionId: props.entityId,
                                    policyId: slotProps.data.id,
                                    key: slotProps.data.id,
                                }),
                            ]),
                        ];
                    },
                    ...slots,
                }),
            ];

            if (detailPolicy.value) {
                const policy = detailPolicy.value;
                const modalTitleId = `policy-detail-modal-${policy.id}`;

                const backdrop = h('div', {
                    class: 'modal-backdrop fade show',
                    onClick() {
                        detailPolicy.value = null;
                    },
                });

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
                                h('h5', { class: 'modal-title', id: modalTitleId }, policy.name),
                                h('button', {
                                    type: 'button',
                                    class: 'btn-close',
                                    'aria-label': 'Close',
                                    onClick() {
                                        detailPolicy.value = null;
                                    },
                                }),
                            ]),
                            h('div', { class: 'modal-body' }, [
                                h(APolicySummary, { entity: policy }),
                            ]),
                            h('div', { class: 'modal-footer' }, [
                                h('button', {
                                    type: 'button',
                                    class: 'btn btn-secondary btn-xs',
                                    onClick() {
                                        detailPolicy.value = null;
                                    },
                                }, 'Close'),
                            ]),
                        ]),
                    ]),
                ]);

                children.push(h(Teleport, { to: 'body' }, [backdrop, modal]));
            }

            return h('div', children);
        };
    },
});

export default APermissionPolicyAssignments;
