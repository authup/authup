/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { 
    EntityTypeMap, 
    PermissionRelation, 
    Policy, 
    RealmScopeValue,  
} from '@authup/core-kit';
import { REALM_SCOPE } from '@authup/core-kit';
import type { PropType } from 'vue';
import {
    defineComponent,
    h,
    ref,
    toRef,
    watch,
} from 'vue';
import type { ButtonSize } from '@vuecs/button';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import {
    VCModal,
    VCModalClose,
    VCModalContent,
    VCModalTitle,
} from '@vuecs/overlays';
import { TranslatorTranslationActionKey, TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import {
    DEFAULT_BUTTON_SIZE,
    SlotName,
    injectHTTPClient,
    useTranslation,
} from '../../../core';
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
        size: {
            type: String as PropType<ButtonSize>,
            default: DEFAULT_BUTTON_SIZE,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        const client = injectHTTPClient();

        const modalOpen = ref(false);
        const busy = ref(false);
        const currentPolicyId = ref<string | null>(props.entity.policy_id);
        const currentRealmScope = ref<RealmScopeValue | null>(props.entity.realm_scope ?? null);
        // The detail view is a nested modal: Escape / outside-click close it
        // back to the list (handled by the inner VCModalContent), and another
        // Escape then closes the outer list modal.
        const detailPolicy = ref<Policy | null>(null);

        const entityRef = toRef(props, 'entity');
        watch(entityRef, (val) => {
            currentPolicyId.value = val.policy_id;
            currentRealmScope.value = val.realm_scope ?? null;
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
            } catch (e) {
                if (e instanceof Error) {
                    emit('failed', e);
                }
            } finally {
                busy.value = false;
            }
        };

        const handleRealmScopeSelect = async (scope: RealmScopeValue) => {
            if (busy.value || currentRealmScope.value === scope) return;

            const api = hasOwnProperty(client, props.entityType) ?
                client[props.entityType] as any :
                undefined;

            if (!api || !api.update) return;

            busy.value = true;
            try {
                const response = await api.update(props.entity.id, { realm_scope: scope });
                // Reflect the server-capped value: a restricted actor's chosen scope may be
                // narrowed server-side, so prefer the persisted scope from the response.
                currentRealmScope.value = (
                    response &&
                    typeof response === 'object' &&
                    hasOwnProperty(response, 'realm_scope')
                ) ?
                    response.realm_scope as RealmScopeValue | null :
                    scope;
                emit('updated', response);
            } catch (e) {
                if (e instanceof Error) {
                    emit('failed', e);
                }
            } finally {
                busy.value = false;
            }
        };

        const translationJunctionPolicy = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.JUNCTION_POLICY,
        });

        const translationJunctionRealmScope = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.JUNCTION_REALM_SCOPE,
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

        const renderCloseIcon = () => h(VCModalClose, {
            class: 'text-fg-muted hover:text-fg',
            'aria-label': translationClose.value,
        }, () => h(VCIcon, { name: 'fa6-solid:xmark' }));

        const renderRealmScopeSelector = () => h('div', { class: 'flex flex-col gap-1' }, [
            h('div', { class: 'text-sm font-medium' }, translationJunctionRealmScope.value),
            h('div', { class: 'flex flex-wrap gap-1' }, Object.values(REALM_SCOPE).map((scope) => {
                const isSelected = currentRealmScope.value === scope;
                return h(VCButton, {
                    key: scope,
                    size: props.size,
                    color: isSelected ? 'primary' : 'neutral',
                    variant: isSelected ? 'solid' : 'soft',
                    disabled: busy.value,
                    label: scope,
                    onClick(e: Event) {
                        e.preventDefault();
                        handleRealmScopeSelect(scope as RealmScopeValue);
                    },
                });
            })),
        ]);

        const renderListContent = () => [
            h('div', { class: 'flex items-center justify-between gap-2' }, [
                h(VCModalTitle, () => translationJunctionPolicy.value),
                renderCloseIcon(),
            ]),
            renderRealmScopeSelector(),
            h(APolicies, { query: { filters: { parent_id: null } } }, {
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
                                size: props.size,
                                color: selectColor,
                                variant: selectVariant,
                                disabled: busy.value,
                                onClick(e: Event) {
                                    e.preventDefault();
                                    if (isSelected) {
                                        handlePolicySelect(null);
                                    } else {
                                        handlePolicySelect(slotProps.data.id);
                                    }
                                },
                            }, { leading: () => h(VCIcon, { name: isSelected ? 'fa6-solid:check' : 'fa6-solid:plus' }) }),
                        ]),
                    ];
                },
            }),
            h('div', { class: 'flex items-center justify-end gap-2' }, [
                currentPolicyId.value ?
                    h(VCButton, {
                        type: 'button',
                        size: props.size,
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
                    size: props.size,
                    color: 'neutral',
                    variant: 'soft',
                    label: translationClose.value,
                    onClick() {
                        modalOpen.value = false;
                    },
                }),
            ]),
        ];

        const renderDetailContent = (policy: Policy) => [
            h('div', { class: 'flex items-center justify-between gap-2' }, [
                h(VCModalTitle, () => policy.name),
                renderCloseIcon(),
            ]),
            h(APolicySummary, { entity: policy }),
            h('div', { class: 'flex items-center justify-end gap-2' }, [
                h(VCButton, {
                    type: 'button',
                    size: props.size,
                    color: 'neutral',
                    variant: 'outline',
                    label: translationBack.value,
                    onClick() {
                        detailPolicy.value = null;
                    },
                }, { leading: () => h(VCIcon, { name: 'fa6-solid:arrow-left' }) }),
            ]),
        ];

        return () => {
            let triggerColor: 'neutral' | 'primary' = 'neutral';
            let triggerVariant: 'solid' | 'soft' = 'soft';
            if (busy.value) {
                triggerVariant = 'solid';
            } else if (currentPolicyId.value) {
                triggerColor = 'primary';
                triggerVariant = 'solid';
            }

            return h('span', { class: 'inline-flex items-center' }, [
                h(VCButton, {
                    size: props.size,
                    color: triggerColor,
                    variant: triggerVariant,
                    disabled: busy.value,
                    onClick(e: Event) {
                        e.preventDefault();
                        modalOpen.value = true;
                    },
                }, { leading: () => h(VCIcon, { name: 'fa6-solid:gear' }) }),
                h(VCModal, {
                    open: modalOpen.value,
                    'onUpdate:open': (value: boolean) => {
                        modalOpen.value = value;
                        // Closing the list also discards any open detail view —
                        // the detail is a sibling VCModal, so clear its state on
                        // the same close path to keep the two modals in sync.
                        if (!value) {
                            detailPolicy.value = null;
                        }
                    },
                }, {
                    default: () => (modalOpen.value ?
                        h(VCModalContent, null, { default: () => renderListContent() }) :
                        undefined),
                }),
                h(VCModal, {
                    open: !!detailPolicy.value,
                    'onUpdate:open': (value: boolean) => {
                        if (!value) {
                            detailPolicy.value = null;
                        }
                    },
                }, {
                    default: () => (detailPolicy.value ?
                        h(VCModalContent, null, { default: () => renderDetailContent(detailPolicy.value as Policy) }) :
                        undefined),
                }),
            ]);
        };
    },
});
