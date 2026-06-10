/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationFieldKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationFieldEnglish : NamespaceTranslations<`${TranslatorTranslationFieldKey}`> = {
    [TranslatorTranslationFieldKey.NAME]: 'Name',
    [TranslatorTranslationFieldKey.DISPLAY_NAME]: 'Display name',
    [TranslatorTranslationFieldKey.EMAIL]: 'Email',
    [TranslatorTranslationFieldKey.EXTERNAL_ID]: 'External ID',
    [TranslatorTranslationFieldKey.DESCRIPTION]: 'Description',
    [TranslatorTranslationFieldKey.SECRET]: 'Secret',
    [TranslatorTranslationFieldKey.REDIRECT_URIS]: 'Redirect URI(s)',
    [TranslatorTranslationFieldKey.PASSWORD]: 'Password',
    [TranslatorTranslationFieldKey.DECISION_STRATEGY]: 'Decision strategy',
    [TranslatorTranslationFieldKey.HASHED]: 'Hashed',
    [TranslatorTranslationFieldKey.URL]: 'URL',
    [TranslatorTranslationFieldKey.CLIENT_SCOPES]: 'Client scopes',
    [TranslatorTranslationFieldKey.START]: 'Start',
    [TranslatorTranslationFieldKey.END]: 'End',
    [TranslatorTranslationFieldKey.INTERVAL]: 'Interval',
    [TranslatorTranslationFieldKey.DAY_OF_WEEK]: 'Day of Week',
    [TranslatorTranslationFieldKey.DAY_OF_MONTH]: 'Day of Month',
    [TranslatorTranslationFieldKey.DAY_OF_YEAR]: 'Day of Year',
    [TranslatorTranslationFieldKey.VALUE_IS_REGEX]: 'Is the value a regex pattern?',

    [TranslatorTranslationFieldKey.CODE]: 'Code',
};
