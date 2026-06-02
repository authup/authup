/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ComponentDefaultValues } from '@vuecs/core';
import type { SubmitButtonDefaults } from '@vuecs/forms';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    useTranslation,
} from '../translator';

/**
 * Build the `submitButton` defaults for @vuecs/forms's
 * `useSubmitButton()` composable, wired to authup's translator. Pass into
 * `app.use(vuecs, { defaults: { submitButton: ... } })` once at app
 * bootstrap so `useSubmitButton()` / `buildFormSubmit()` pick up
 * locale-reactive labels without per-call work.
 *
 * MUST be called within an injection context (component setup or a Nuxt
 * plugin's `setup()`) — `useTranslation` reads the live locale provider
 * via `inject()`. The translator must be installed first.
 */
export function buildSubmitButtonDefaults(): ComponentDefaultValues<SubmitButtonDefaults> {
    return {
        createText: useTranslation({
            namespace: TranslatorTranslationGroup.DEFAULT,
            key: TranslatorTranslationDefaultKey.CREATE,
        }),
        updateText: useTranslation({
            namespace: TranslatorTranslationGroup.DEFAULT,
            key: TranslatorTranslationDefaultKey.UPDATE,
        }),
        createIcon: 'fa6-solid:plus',
        updateIcon: 'fa6-solid:floppy-disk',
        createColor: 'primary',
        updateColor: 'primary',
    };
}
