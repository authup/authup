/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ComponentDefaultValues } from '@vuecs/core';
import type { EmptyStateDefaults } from '@vuecs/elements';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationNamespace,
    TranslatorTranslationVuecsKey,
} from '@authup/i18n';
import { useTranslation } from '../translator/index.ts';

/**
 * Translator-wired defaults for `<VCEmptyState variant="noResults">`,
 * whose built-in copy is English. Same injection and scope requirements
 * as `buildSubmitButtonDefaults()`.
 */
export function buildEmptyStateDefaults(): ComponentDefaultValues<EmptyStateDefaults> {
    return {
        noResultsTitle: useTranslation({
            namespace: TranslatorTranslationNamespace.VUECS,
            key: TranslatorTranslationVuecsKey.NO_RESULTS_TITLE,
        }),
        noResultsDescription: useTranslation({
            namespace: TranslatorTranslationNamespace.VUECS,
            key: TranslatorTranslationVuecsKey.NO_RESULTS_DESCRIPTION,
        }),
        noResultsActionLabel: useTranslation({
            namespace: TranslatorTranslationNamespace.ACTION,
            key: TranslatorTranslationActionKey.RESET,
        }),
    };
}
