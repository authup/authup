/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { pickEntityAPI } from '@authup/core-http-kit';
import type {
    EntityTypeMap,
    PermissionRelation,
    Policy,
    RealmScopeValue,
} from '@authup/core-kit';
import { REALM_SCOPE } from '@authup/core-kit';
import { defineQuery } from '@rapiq/core';
import type { PropType, Ref } from 'vue';
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
        // The junction this control manages. With an `id` it is an existing binding → EDIT mode
        // (each selection patches immediately). Without an `id` it is a "template" carrying just
        // the base fields the new junction is born with (owner FK + permissionId) → CREATE mode
        // (selections are staged, then the control performs the create itself). One prop, both
        // modes — the form-initialValue pattern.
        entity: {
            type: Object as PropType<Partial<PermissionBindingEntity>>,
            required: false,
            default: undefined,
        },
        size: {
            type: String as PropType<ButtonSize>,
            default: DEFAULT_BUTTON_SIZE,
        },
    },
    emits: ['created', 'updated', 'failed'],
    setup(props, { emit }) {
        const client = injectHTTPClient();

        const modalOpen = ref(false);
        const busy = ref(false);
        // Create mode = no persisted junction yet (no id). In that mode selections are STAGED
        // locally and committed once via the create; in edit mode each selection patches
        // immediately.
        const isCreateMode = () => !props.entity?.id;
        const currentPolicyId = ref<string | null>(props.entity?.policyId ?? null);
        // Preselect the backend default (`own`) in create mode so a sensible reach is staged.
        const currentRealmScope = ref<RealmScopeValue | null>(
            props.entity?.realmScope ?? (props.entity?.id ? null : REALM_SCOPE.OWN),
        );
        // The detail view is a nested modal: Escape / outside-click close it
        // back to the list (handled by the inner VCModalContent), and another
        // Escape then closes the outer list modal.
        const detailPolicy = ref<Policy | null>(null);

        const entityRef = toRef(props, 'entity');
        watch(entityRef, (val) => {
            currentPolicyId.value = val?.policyId ?? null;
            currentRealmScope.value = val?.realmScope ?? (val?.id ? null : REALM_SCOPE.OWN);
        }, { deep: true });

        const handlePolicySelect = async (policyId: string | null) => {
            if (busy.value) return;

            // Create mode: stage the choice; it is committed by the `create` emit.
            if (isCreateMode()) {
                currentPolicyId.value = policyId;
                return;
            }

            const entityId = props.entity?.id;
            const api = pickEntityAPI(client, props.entityType);

            if (!api?.update || !entityId) return;

            busy.value = true;
            try {
                const response = await api.update(entityId, { policyId });
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

            // Create mode: stage the choice; it is committed by the `create` emit.
            if (isCreateMode()) {
                currentRealmScope.value = scope;
                return;
            }

            const entityId = props.entity?.id;
            const api = pickEntityAPI(client, props.entityType);

            if (!api?.update || !entityId) return;

            busy.value = true;
            try {
                const response = await api.update(entityId, { realmScope: scope });
                // Reflect the server-capped value: a restricted actor's chosen scope may be
                // narrowed server-side, so prefer the persisted scope from the response.
                currentRealmScope.value = (
                    response &&
                    typeof response === 'object' &&
                    hasOwnProperty(response, 'realmScope')
                ) ?
                    response.realmScope as RealmScopeValue | null :
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

        // Commit the staged (realmScope, policyId) as a NEW junction. Performed here via the
        // injected client — symmetric with the update path — using the entity template (the FK
        // base fields) as the create payload base. The created entity is emitted so the parent can
        // sync its manager (manager.created); it flows back as `props.entity` (now with an id),
        // switching the control to edit mode. The server caps the chosen scope.
        const handleCreate = async () => {
            if (busy.value || !isCreateMode() || !props.entity) return;

            const api = pickEntityAPI(client, props.entityType);

            if (!api?.create) return;

            busy.value = true;
            try {
                const response = await api.create({
                    ...props.entity,
                    realmScope: currentRealmScope.value ?? undefined,
                    policyId: currentPolicyId.value ?? undefined,
                });
                emit('created', response);
                modalOpen.value = false;
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

        const translationAdd = useTranslation({
            namespace: TranslatorTranslationNamespace.ACTION,
            key: TranslatorTranslationActionKey.ADD,
        });

        const translationJunctionRealmScope = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.JUNCTION_REALM_SCOPE,
        });

        // Localized label + one-line hint per reach. Keyed off the string VALUE of REALM_SCOPE
        // (camelCase `ownOrNull`), not a member-name derivation. `none` is included so a persisted
        // none-scoped binding can be shown read-only in edit mode (it is never user-selectable —
        // see realmScopeOptions).
        const realmScopeLabels: Record<string, Ref<string>> = {
            [REALM_SCOPE.NONE]: useTranslation({
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.REALM_SCOPE_NONE,
            }),
            [REALM_SCOPE.OWN]: useTranslation({
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.REALM_SCOPE_OWN,
            }),
            [REALM_SCOPE.OWN_OR_NULL]: useTranslation({
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.REALM_SCOPE_OWN_OR_NULL,
            }),
            [REALM_SCOPE.ANY]: useTranslation({
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.REALM_SCOPE_ANY,
            }),
        };

        const realmScopeHints: Record<string, Ref<string>> = {
            [REALM_SCOPE.NONE]: useTranslation({
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.REALM_SCOPE_NONE_HINT,
            }),
            [REALM_SCOPE.OWN]: useTranslation({
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.REALM_SCOPE_OWN_HINT,
            }),
            [REALM_SCOPE.OWN_OR_NULL]: useTranslation({
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.REALM_SCOPE_OWN_OR_NULL_HINT,
            }),
            [REALM_SCOPE.ANY]: useTranslation({
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.REALM_SCOPE_ANY_HINT,
            }),
        };

        // Only the reachable scopes are user-selectable; `none` stays a valid stored value but
        // is never offered (it would create a grant that matches no realm).
        const realmScopeOptions = Object.values(REALM_SCOPE)
            .filter((scope) => scope !== REALM_SCOPE.NONE);

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

        const renderRealmScopeSelector = () => {
            const current = currentRealmScope.value;
            const selectedHint = current ? realmScopeHints[current]?.value : undefined;
            // `none` is a valid persisted reach (e.g. a fail-closed propagation) but not
            // user-selectable. Surface it read-only so an existing none-scoped binding still
            // renders its state instead of appearing unset.
            const showNone = current === REALM_SCOPE.NONE;

            return h('div', { class: 'flex flex-col gap-1' }, [
                h('div', { class: 'text-sm font-medium' }, translationJunctionRealmScope.value),
                h('div', { class: 'flex flex-wrap gap-1' }, [
                    showNone ?
                        h(VCButton, {
                            key: REALM_SCOPE.NONE,
                            size: props.size,
                            color: 'primary',
                            variant: 'solid',
                            disabled: true,
                            label: realmScopeLabels[REALM_SCOPE.NONE]?.value ?? REALM_SCOPE.NONE,
                            title: realmScopeHints[REALM_SCOPE.NONE]?.value,
                        }) :
                        undefined,
                    ...realmScopeOptions.map((scope) => {
                        const isSelected = current === scope;
                        return h(VCButton, {
                            key: scope,
                            size: props.size,
                            color: isSelected ? 'primary' : 'neutral',
                            variant: isSelected ? 'solid' : 'soft',
                            disabled: busy.value,
                            label: realmScopeLabels[scope]?.value ?? scope,
                            title: realmScopeHints[scope]?.value,
                            onClick(e: Event) {
                                e.preventDefault();
                                handleRealmScopeSelect(scope as RealmScopeValue);
                            },
                        });
                    }),
                ]),
                selectedHint ?
                    h('div', { class: 'text-xs text-fg-muted' }, selectedHint) :
                    undefined,
            ]);
        };

        const renderListContent = () => [
            h('div', { class: 'flex items-center justify-between gap-2' }, [
                h(VCModalTitle, () => translationJunctionPolicy.value),
                renderCloseIcon(),
            ]),
            renderRealmScopeSelector(),
            h(APolicies, { query: defineQuery<Policy>({ filters: { parentId: null } }) }, {
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
                // Edit mode only: a quick "reset policy" shortcut (create stages, so no reset).
                (!isCreateMode() && currentPolicyId.value) ?
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
                // Create mode: commit the staged (scope, policy) as a new binding.
                isCreateMode() ?
                    h(VCButton, {
                        type: 'button',
                        size: props.size,
                        color: 'primary',
                        label: translationAdd.value,
                        disabled: busy.value,
                        onClick() {
                            handleCreate();
                        },
                    }, { leading: () => h(VCIcon, { name: 'fa6-solid:plus' }) }) :
                    undefined,
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
            const createMode = isCreateMode();

            let triggerColor: 'neutral' | 'primary' = 'neutral';
            let triggerVariant: 'solid' | 'soft' = 'soft';
            if (busy.value) {
                triggerVariant = 'solid';
            } else if (!createMode && currentPolicyId.value) {
                // Edit mode with a bound policy → highlight the gear.
                triggerColor = 'primary';
                triggerVariant = 'solid';
            }

            // The trigger is icon-only, so give it a programmatic name that also conveys the mode
            // (assign-with-options vs edit the binding) to assistive tech.
            const triggerLabel = createMode ? translationAdd.value : translationJunctionPolicy.value;

            return h('span', { class: 'inline-flex items-center' }, [
                h(VCButton, {
                    size: props.size,
                    color: triggerColor,
                    variant: triggerVariant,
                    disabled: busy.value,
                    'aria-label': triggerLabel,
                    title: triggerLabel,
                    onClick(e: Event) {
                        e.preventDefault();
                        modalOpen.value = true;
                    },
                    // Create mode → "assign with options" (sliders); edit mode → gear.
                }, { leading: () => h(VCIcon, { name: createMode ? 'fa6-solid:sliders' : 'fa6-solid:gear' }) }),
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
