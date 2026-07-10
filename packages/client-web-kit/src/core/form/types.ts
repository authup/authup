/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type PartialRecordWithNull<T extends Record<string, any>> = {
    [K in keyof T]?: T[K] | null
};

/**
 * Structural subset of `@validup/vue`'s `FieldsAccessor` — just what
 * edit-preserving hydration needs (per-field dirty flag + reset).
 */
export type FormFieldsAccessor = {
    at(path: string): {
        $dirty: { value: boolean },
        $reset: () => void,
    },
};

export type AssignFormPropertiesOptions = {
    /**
     * The validup `fields` accessor of the composable bound to the form
     * state (`v.fields`). When provided, hydration preserves unsaved
     * user edits: a dirty field whose current value differs from the
     * incoming one is skipped, while a dirty field whose value matches
     * the incoming one is re-assigned and reset (the edit has been
     * persisted, so subsequent syncs flow again).
     */
    fields?: FormFieldsAccessor,
};
