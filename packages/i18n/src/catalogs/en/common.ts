/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationCommonKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationCommonEnglish : NamespaceTranslations<`${TranslatorTranslationCommonKey}`> = {
    [TranslatorTranslationCommonKey.GENERAL]: 'General',
    [TranslatorTranslationCommonKey.OVERVIEW]: 'Overview',
    [TranslatorTranslationCommonKey.LOADING]: 'Loading...',
    [TranslatorTranslationCommonKey.ACTIVE]: 'Active',
    [TranslatorTranslationCommonKey.INACTIVE]: 'Inactive',
    [TranslatorTranslationCommonKey.LOCKED]: 'Locked',
    [TranslatorTranslationCommonKey.NOT_LOCKED]: 'Not locked',
    [TranslatorTranslationCommonKey.APPLICATION]: 'Application',
    [TranslatorTranslationCommonKey.SEARCH]: 'Search',
    [TranslatorTranslationCommonKey.NO_RESULTS]: 'No results found.',
};
