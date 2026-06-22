/*
 * Builder-API compat shims over @vuecs/forms 4.x SFCs.
 *
 * The pre-4.x form-controls package exposed render-function builders
 * (`buildFormGroup`, `buildFormInput`, …) that returned VNodes. The
 * 4.x rewrite replaced them with Reka-backed SFCs. Most builders have
 * since been retired at their call sites; the remaining two —
 * `buildFormInput`/`buildFormInputText` (used by the list-search box)
 * and `buildFormSubmit` (backs `AFormSubmit`) — preserve the old
 * call-site shape on top of the new SFCs until those last consumers
 * migrate to native `<VC*>` template usage.
 */
import type {
    HTMLAttributes,
    MaybeRef,
    VNodeChild,
} from 'vue';
import { h, mergeProps, unref } from 'vue';
import { VCButton } from '@vuecs/button';
import { VCFormInput, useSubmitButton } from '@vuecs/forms';

type LegacyAttrs = HTMLAttributes & Record<string, any>;

export type FormInputBuildOptionsInput = {
    value?: MaybeRef<unknown>;
    onChange?: (input: any) => void;
    type?: string;
    group?: boolean;
    groupPrepend?: boolean;
    groupPrependContent?: VNodeChild;
    groupAppend?: boolean;
    groupAppendContent?: VNodeChild;
    /** Native attributes forwarded to the inner `<input>` (legacy compat — old builder API). */
    props?: LegacyAttrs;
    /** Additional classes on the rendered input element. */
    class?: any;
};

function modelValueOf(value: MaybeRef<unknown> | undefined): string {
    const v = unref(value);
    if (v === null || v === undefined) return '';
    return typeof v === 'string' ? v : String(v);
}

export function buildFormInput(input: FormInputBuildOptionsInput): VNodeChild {
    const base = {
        modelValue: modelValueOf(input.value),
        'onUpdate:modelValue': (next: string) => input.onChange?.(next),
        type: input.type,
        group: input.group,
        groupPrepend: input.groupPrepend,
        groupPrependContent: typeof input.groupPrependContent === 'string' ?
            input.groupPrependContent :
            undefined,
        groupAppend: input.groupAppend,
        groupAppendContent: typeof input.groupAppendContent === 'string' ?
            input.groupAppendContent :
            undefined,
        class: input.class,
    };
    return h(VCFormInput, input.props ? mergeProps(base as never, input.props as never) : base);
}

export function buildFormInputText(input: FormInputBuildOptionsInput): VNodeChild {
    return buildFormInput({ ...input, type: input.type ?? 'text' });
}

export type FormSubmitOptionsInput = {
    submit: () => void | Promise<void>;
    busy?: MaybeRef<boolean>;
    invalid?: boolean;
    isEditing?: boolean;
    createText?: string;
    updateText?: string;
    /** Iconify name rendered before the label in create mode. Defaults to a FA plus glyph. */
    createIcon?: string;
    /** Iconify name rendered before the label in update mode. Defaults to a FA save glyph. */
    updateIcon?: string;
    type?: string;
    /** Set to `false` to suppress the leading icon entirely. Defaults to `true`. */
    icon?: boolean;
};

export function buildFormSubmit(input: FormSubmitOptionsInput): VNodeChild {
    // Delegate label / icon / color resolution to @vuecs/forms's
    // `useSubmitButton` composable. Per-call options below STILL override
    // the bindings — authup's translator + icon defaults are wired into
    // the vuecs DefaultsManager once at app bootstrap (see
    // `apps/client-web/plugins/vuecs.ts`), so a caller passing nothing
    // here gets locale-reactive labels for free.
    const bindings = useSubmitButton({
        isEditing: () => !!input.isEditing,
        loading: () => !!unref(input.busy),
        disabled: () => !!input.invalid || !!unref(input.busy),
    });

    const isEditing = !!input.isEditing;
    const resolved = bindings.value;

    const label = (isEditing ? input.updateText : input.createText) ?? resolved.label;

    let iconLeft: string | undefined;
    if (input.icon === false) {
        iconLeft = undefined;
    } else {
        const iconOverride = isEditing ? input.updateIcon : input.createIcon;
        iconLeft = iconOverride ?? resolved.iconLeft;
    }

    return h(
        VCButton,
        {
            type: input.type ?? resolved.type,
            color: resolved.color,
            size: 'sm',
            loading: resolved.loading,
            disabled: resolved.disabled,
            // `mt-3` matches the `mb-3` inter-group spacing applied to
            // every form-group root (see client-web-theme's `formGroup`
            // override), so the submit button sits at one consistent
            // gap below the last form field instead of butting up
            // against it.
            class: 'mt-3',
            iconLeft,
            onClick: () => { void input.submit(); },
        },
        () => label,
    );
}
