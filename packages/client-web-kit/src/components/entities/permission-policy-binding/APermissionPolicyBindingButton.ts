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
import { VCButton } from '@vuecs/button';
import { TranslatorTranslationActionKey, TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { SlotName, injectHTTPClient, useTranslation } from '../../../core';
import { hasOwnProperty } from '@authup/kit';
import { APolicies } from '../policy/APolicies';
import APolicyInlineInfo from '../policy/APolicyInlineInfo.vue';
import APolicySummary from '../policy/APolicySummary.vue';

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

        const translationJunctionPolicy = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.JUNCTION_POLICY,
        });

        const translationBack = useTranslation({
            namespace: TranslatorTranslationNamespace.ACTION,
            key: TranslatorTranslationActionKey.BACK,
        });

        const translationReset = useTranslation({
            namespace: TranslatorTranslationNamespace.ACTION,
            key: TranslatorTranslationActionKey.RESET,
        });

        const translationClose = useTranslation({
            namespace: TranslatorTranslationNamespace.ACTION,
            key: TranslatorTranslationActionKey.CLOSE,
        });

        return () => {
            const children = [];

            let triggerColor: 'neutral' | 'primary' = 'neutral';
            let triggerVariant: 'solid' | 'soft' = 'soft';
            if (busy.value) {
                triggerVariant = 'solid';
            } else if (currentPolicyId.value) {
                triggerColor = 'primary';
                triggerVariant = 'solid';
            }

            children.push(h(VCButton, {
                size: 'sm',
                color: triggerColor,
                variant: triggerVariant,
                iconLeft: 'fa6-solid:gear',
                disabled: busy.value,
                onClick(e: Event) {
                    e.preventDefault();
                    modalOpen.value = true;
                },
            }));

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
                        h(VCButton, {
                            type: 'button',
                            size: 'sm',
                            color: 'neutral',
                            variant: 'outline',
                            iconLeft: 'fa6-solid:arrow-left',
                            label: translationBack.value,
                            onClick() {
                                detailPolicy.value = null;
                            },
                        }),
                    ];
                } else {
                    modalTitle = translationJunctionPolicy.value;
                    modalBody = h(APolicies, { query: { filters: { parent_id: null } } }, {
                        [SlotName.ITEM]: (slotProps: { data: Policy }) => {
                            const isSelected = currentPolicyId.value === slotProps.data.id;

                            let selectColor: 'neutral' | 'success' = 'neutral';
                            let selectVariant: 'solid' | 'soft' = 'soft';
                            if (busy.value) {
                                selectVariant = 'solid';
                            } else if (isSelected) {
                                selectColor = 'success';
                                selectVariant = 'solid';
                            }

                            return [
                                h('div', [slotProps.data.name]),
                                h(APolicyInlineInfo, {
                                    entity: slotProps.data,
                                    onDetail: (policy: Policy) => {
                                        detailPolicy.value = policy;
                                    },
                                }),
                                h('div', { class: 'ms-auto' }, [
                                    h(VCButton, {
                                        size: 'sm',
                                        color: selectColor,
                                        variant: selectVariant,
                                        iconLeft: isSelected ? 'fa6-solid:check' : 'fa6-solid:plus',
                                        disabled: busy.value,
                                        onClick(e: Event) {
                                            e.preventDefault();
                                            if (isSelected) {
                                                handlePolicySelect(null);
                                            } else {
                                                handlePolicySelect(slotProps.data.id);
                                            }
                                        },
                                    }),
                                ]),
                            ];
                        },
                    });
                    modalFooter = [
                        currentPolicyId.value ?
                            h(VCButton, {
                                type: 'button',
                                size: 'sm',
                                color: 'warning',
                                label: translationReset.value,
                                disabled: busy.value,
                                onClick() {
                                    handlePolicySelect(null);
                                },
                            }) :
                            undefined,
                        h(VCButton, {
                            type: 'button',
                            size: 'sm',
                            color: 'neutral',
                            variant: 'soft',
                            label: translationClose.value,
                            onClick() {
                                modalOpen.value = false;
                            },
                        }),
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
                                    'aria-label': translationClose.value,
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
