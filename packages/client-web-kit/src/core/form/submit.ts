/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FormSubmitOptionsInput } from './builders';
import { buildFormSubmit } from './builders';
import type { Ref, VNodeChild } from 'vue';
import { ref } from 'vue';

type FormSubmitTranslations = {
    createText: Ref<string>,
    updateText: Ref<string>,
};

/**
 * @deprecated Submit-button labels are now resolved through vuecs's
 * DefaultsManager (see `buildSubmitButtonDefaults()`). Callers can drop
 * this helper and use `buildFormSubmit(...)` directly. Kept as a no-op
 * shim returning empty refs so the 40-odd existing callers continue to
 * compile; will be removed once the migration is complete.
 */
export function createFormSubmitTranslations() : FormSubmitTranslations {
    return {
        createText: ref(''),
        updateText: ref(''),
    };
}

/**
 * @deprecated Use `buildFormSubmit(options)` directly. The translation
 * argument is ignored — labels resolve via vuecs's DefaultsManager
 * (wired in `apps/client-web/plugins/vuecs.ts`).
 */
export function buildFormSubmitWithTranslations(
    options: FormSubmitOptionsInput,
    _translations: FormSubmitTranslations,
) : VNodeChild {
    return buildFormSubmit(options);
}
