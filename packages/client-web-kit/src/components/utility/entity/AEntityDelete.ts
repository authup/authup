/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
import { useAlertDialog } from '@vuecs/overlays';
import type { EntityType, EntityTypeMap } from '@authup/core-kit';
import { pickEntityAPI } from '@authup/core-http-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
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

        // Gate the (irreversible) delete behind a confirmation dialog
        // rendered by the app-level <VCAlertDialogProvider> via
        // useAlertDialog(). On by default — opt out with :with-prompt="false".
        withPrompt: {
            type: Boolean,
            default: true,
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
            const domainAPI = pickEntityAPI(
                apiClient,
                props.entityType as keyof EntityTypeMap,
            );

            if (!domainAPI?.delete) {
                return;
            }

            try {
                const response = await domainAPI.delete(props.entityId);
                ctx.emit('deleted', { ...response.data, id: props.entityId });
            } catch (e) {
                ctx.emit('failed', e);
            }
        });

        const translation = useTranslation({
            namespace: TranslatorTranslationNamespace.ACTION,
            key: TranslatorTranslationActionKey.DELETE,
        });

        // Imperative confirmation dialog, resolved ONLY when prompting is
        // enabled — so `<AEntityDelete :with-prompt="false">` never injects the
        // AlertDialogManager and therefore doesn't require `app.use(installOverlays)`
        // in consumers/tests that skip @vuecs/overlays. `useAlertDialog()` only
        // calls inject() (no lifecycle hooks), so this one-time conditional
        // resolution in setup is safe. When enabled it injects the app-level
        // manager (host: <VCAlertDialogProvider> in the client-web default
        // layout) and resolves true (Delete) / false (Abort / Escape); on the
        // server it resolves false without enqueuing, but onClick is client-only.
        const confirmDialog = props.withPrompt ? useAlertDialog() : undefined;

        // Singular, localized entity noun (`count: 1`) interpolated into the
        // confirmation title as an article-free, infinitive phrase (e.g.
        // "Benutzer wirklich löschen?") — interpolating a gendered article
        // around it ("diese(s) {{entity}}") is grammatically wrong in DE/FR/ES
        // since the article must agree with each noun's gender/case. The nine
        // index pages that mount <AEntityDelete> all pass a primary entity type
        // present in the ENTITY namespace; a non-primary type falls back to the
        // raw key.
        const entityLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: props.entityType,
            count: 1,
        });
        const abortLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.ACTION,
            key: TranslatorTranslationActionKey.ABORT,
        });
        const promptTitle = useTranslation({
            namespace: TranslatorTranslationNamespace.APP,
            key: TranslatorTranslationAppKey.DELETE_CONFIRM_TITLE,
            data: { entity: entityLabel },
        });
        const promptDescription = useTranslation({
            namespace: TranslatorTranslationNamespace.APP,
            key: TranslatorTranslationAppKey.DELETE_CONFIRM_DESCRIPTION,
        });

        const onClick = async ($event: any) => {
            $event.preventDefault();

            // The anchor / dropdown-item render path has no native disabled
            // semantics, so the click has to be dropped here.
            if (busy.value || props.disabled) {
                return undefined;
            }

            if (props.withPrompt && confirmDialog) {
                const confirmed = await confirmDialog({
                    title: promptTitle.value,
                    description: promptDescription.value,
                    confirmLabel: translation.value,
                    cancelLabel: abortLabel.value,
                    tone: 'error',
                });

                if (!confirmed) {
                    return undefined;
                }
            }

            return submit();
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
                        // Icon-only form has no visible text, so surface the
                        // localized action as the accessible name (+ tooltip).
                        'aria-label': props.withText ? undefined : translation.value,
                        title: props.withText ? undefined : translation.value,
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
                    'aria-label': props.withText ? undefined : translation.value,
                    title: props.withText ? undefined : translation.value,
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
