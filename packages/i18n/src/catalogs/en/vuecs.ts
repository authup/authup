/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationVuecsKey } from '../../constants.ts';
import type { NamespaceTranslations } from '../../types.ts';

export const TranslatorTranslationVuecsEnglish : NamespaceTranslations<`${TranslatorTranslationVuecsKey}`> = {
    [TranslatorTranslationVuecsKey.NO_MORE]: 'No more {{name}} available',
    [TranslatorTranslationVuecsKey.NO_RESULTS_TITLE]: 'No results',
    [TranslatorTranslationVuecsKey.NO_RESULTS_DESCRIPTION]: 'Try adjusting your search or filters.',
};
