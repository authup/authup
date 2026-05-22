/*
 * Builder-API compat shims over @vuecs/forms 4.x SFCs.
 *
 * The pre-4.x form-controls package exposed render-function builders
 * (`buildFormGroup`, `buildFormInput`, …) that returned VNodes. The
 * 4.x rewrite replaced them with Reka-backed SFCs. authup's entity
 * forms compose hundreds of builder calls inside `render()` functions;
 * rewriting them as `<VCFormGroup>` template usage is a separate
 * follow-up. These thin wrappers preserve the old call-site shape on
 * top of the new SFCs.
 */
import type { 
    HTMLAttributes, 
    MaybeRef, 
    VNode, 
    VNodeChild, 
} from 'vue';
import { h, mergeProps, unref } from 'vue';
import { VCButton } from '@vuecs/button';
import {
    VCFormCheckbox,
    VCFormGroup,
    VCFormInput,
    VCFormSelect,
    VCFormSwitch,
    VCFormTextarea,
} from '@vuecs/forms';
import type { FormOption, ValidationMessages } from '@vuecs/forms';

type LegacyAttrs = HTMLAttributes & Record<string, any>;

type ValidationSeverity = 'error' | 'warning';

export type FormGroupOptionsInput = {
    label?: boolean;
    labelTag?: string;
    labelContent?: VNodeChild;
    hint?: boolean;
    hintTag?: string;
    hintContent?: VNodeChild;
    validation?: boolean;
    validationMessages?: ValidationMessages;
    validationSeverity?: ValidationSeverity;
    content?: VNodeChild;
};

export function buildFormGroup(input: FormGroupOptionsInput): VNode {
    return h(
        VCFormGroup,
        {
            label: input.label,
            labelTag: input.labelTag,
            labelContent: typeof input.labelContent === 'string' ? input.labelContent : undefined,
            hint: input.hint,
            hintTag: input.hintTag,
            hintContent: typeof input.hintContent === 'string' ? input.hintContent : undefined,
            validation: input.validation,
            validationMessages: input.validationMessages,
            validationSeverity: input.validationSeverity,
        },
        {
            default: () => input.content,
            ...(typeof input.labelContent !== 'string' && input.labelContent !== undefined ?
                { label: () => input.labelContent } :
                {}),
            ...(typeof input.hintContent !== 'string' && input.hintContent !== undefined ?
                { hint: () => input.hintContent } :
                {}),
        },
    );
}

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

export type FormTextareaBuildOptionsInput = {
    value?: MaybeRef<unknown>;
    onChange?: (input: any) => void;
    /** Native attributes forwarded to the inner `<textarea>` (legacy compat). */
    props?: LegacyAttrs;
    class?: any;
};

export function buildFormTextarea(input: FormTextareaBuildOptionsInput): VNodeChild {
    const base = {
        modelValue: modelValueOf(input.value),
        'onUpdate:modelValue': (next: string) => input.onChange?.(next),
        class: input.class,
    };
    return h(VCFormTextarea, input.props ? mergeProps(base as never, input.props as never) : base);
}

export type FormCheckboxBuildOptionsInput = {
    value?: MaybeRef<unknown>;
    onChange?: (input: any) => void;
    label?: boolean;
    labelContent?: VNodeChild;
    group?: boolean;
    /** Legacy compat — old builder accepted a class for the outer group wrapper. */
    groupClass?: any;
    class?: any;
    props?: LegacyAttrs;
};

export function buildFormCheckbox(input: FormCheckboxBuildOptionsInput): VNodeChild {
    const base = {
        modelValue: !!unref(input.value),
        'onUpdate:modelValue': (next: boolean) => input.onChange?.(next),
        label: input.label,
        group: input.group,
        labelContent: typeof input.labelContent === 'string' ? input.labelContent : undefined,
        class: input.class ?? input.groupClass,
    };
    return h(
        VCFormCheckbox,
        input.props ? mergeProps(base as never, input.props as never) : base,
        typeof input.labelContent !== 'string' && input.labelContent !== undefined ?
            { label: () => input.labelContent } :
            undefined,
    );
}

/**
 * Switch (toggle) variant of `buildFormCheckbox`. Renders `<VCFormSwitch>`
 * — the dedicated slider component in `@vuecs/forms` 4.x — using the same
 * `{ value, onChange, label, labelContent, groupClass, ... }` shape so the
 * pre-1.x `buildFormCheckbox({ groupClass: 'form-switch' })` call sites
 * migrate by a single rename.
 *
 * `groupClass` maps to `themeClass.group` (the OUTER wrapper override),
 * not `class` — Vue's `mergeProps` would otherwise concatenate it onto
 * the inner SwitchRoot button, which offsets the button relative to the
 * label inside the wrapper's `items-center` and visibly misaligns them.
 */
export function buildFormSwitch(input: FormCheckboxBuildOptionsInput): VNodeChild {
    const base = {
        modelValue: !!unref(input.value),
        'onUpdate:modelValue': (next: boolean) => input.onChange?.(next),
        label: input.label,
        group: input.group,
        labelContent: typeof input.labelContent === 'string' ? input.labelContent : undefined,
        class: input.class,
        themeClass: input.groupClass ? { group: input.groupClass } : undefined,
    };
    return h(
        VCFormSwitch,
        input.props ? mergeProps(base as never, input.props as never) : base,
        typeof input.labelContent !== 'string' && input.labelContent !== undefined ?
            { label: () => input.labelContent } :
            undefined,
    );
}

export type FormSelectOptionLegacy = {
    id?: string | number;
    label?: string;
    value: unknown;
    disabled?: boolean;
};

export type FormSelectBuildOptionsInput = {
    value?: MaybeRef<unknown>;
    onChange?: (input: any) => void;
    options: (FormSelectOptionLegacy | FormOption)[];
    optionDefault?: boolean;
    optionDefaultId?: string | number;
    optionDefaultValue?: string;
};

export function buildFormSelect(input: FormSelectBuildOptionsInput): VNodeChild {
    const options: FormOption[] = input.options.map((o) => {
        const newShape = o as FormOption;
        const legacyShape = o as FormSelectOptionLegacy;
        // Resolution order: explicit `label` → string `value` → legacy `id` → empty.
        // Coalescing through `??` (not `||`) means literal `0` / `''` are
        // honored when explicitly passed, instead of silently swapped to the
        // next branch — important for numeric-id catalogs where `0` is valid.
        const label = newShape.label ??
            (typeof o.value === 'string' ? o.value : undefined) ??
            (legacyShape.id !== undefined ? String(legacyShape.id) : '');
        return {
            value: o.value as never,
            label,
            disabled: o.disabled,
        };
    });
    if (input.optionDefault) {
        // Old form-controls 2.x split the default option's sentinel value
        // (`optionDefaultId`) from its display text (`optionDefaultValue`):
        // a numeric/empty-string id let consumers distinguish "no choice"
        // from a real option without parsing the label back to a value.
        // Preserve that contract: id drives the selected `value`, value
        // (a string) drives the visible `label`. Fall through to the other
        // when only one is set.
        const defaultId = input.optionDefaultId ?? input.optionDefaultValue ?? '';
        const defaultText = input.optionDefaultValue ??
            (input.optionDefaultId !== undefined ? String(input.optionDefaultId) : '');
        options.unshift({
            value: defaultId as never,
            label: defaultText,
        });
    }
    return h(VCFormSelect, {
        modelValue: unref(input.value) as never,
        'onUpdate:modelValue': (next: unknown) => input.onChange?.(next),
        options,
    });
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
    const busy = !!unref(input.busy);
    const isEditing = !!input.isEditing;
    const invalid = !!input.invalid;
    const label = isEditing ?
        (input.updateText ?? 'Update') :
        (input.createText ?? 'Create');
    // Restore parity with the old form-controls 2.x defaults:
    //   createIconClass: 'fa-solid fa-plus'        → fa6-solid:plus
    //   updateIconClass: 'fa-solid fa-save'        → fa6-solid:floppy-disk
    // Consumers can opt out via `icon: false` or override per call.
    let iconLeft: string | undefined;
    if (input.icon === false) {
        iconLeft = undefined;
    } else if (isEditing) {
        iconLeft = input.updateIcon ?? 'fa6-solid:floppy-disk';
    } else {
        iconLeft = input.createIcon ?? 'fa6-solid:plus';
    }

    // Old buildFormSubmit defaulted both create + update buttons to the
    // primary color (no semantic differentiation). Keep that contract
    // until/unless authup explicitly opts into a per-mode color scheme.
    return h(
        VCButton,
        {
            type: input.type ?? 'submit',
            disabled: invalid || busy,
            loading: busy,
            color: 'primary',
            iconLeft,
            onClick: () => { void input.submit(); },
        },
        () => label,
    );
}
