/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationFieldKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationFieldGerman : NamespaceTranslations<`${TranslatorTranslationFieldKey}`> = {
    [TranslatorTranslationFieldKey.NAME]: 'Name',
    [TranslatorTranslationFieldKey.DISPLAY_NAME]: 'Anzeigename',
    [TranslatorTranslationFieldKey.EMAIL]: 'E-Mail',
    [TranslatorTranslationFieldKey.EXTERNAL_ID]: 'Externe ID',
    [TranslatorTranslationFieldKey.DESCRIPTION]: 'Beschreibung',
    [TranslatorTranslationFieldKey.SECRET]: 'Geheimnis',
    [TranslatorTranslationFieldKey.REDIRECT_URIS]: 'Weiterleitungs-URIs',
    [TranslatorTranslationFieldKey.PASSWORD]: 'Passwort',
    [TranslatorTranslationFieldKey.DECISION_STRATEGY]: 'Entscheidungsstrategie',
    [TranslatorTranslationFieldKey.HASHED]: 'Gehasht',
    [TranslatorTranslationFieldKey.URL]: 'URL',
    [TranslatorTranslationFieldKey.CLIENT_SCOPES]: 'Client-Bereiche',
    [TranslatorTranslationFieldKey.START]: 'Start',
    [TranslatorTranslationFieldKey.END]: 'Ende',
    [TranslatorTranslationFieldKey.INTERVAL]: 'Intervall',
    [TranslatorTranslationFieldKey.DAY_OF_WEEK]: 'Wochentag',
    [TranslatorTranslationFieldKey.DAY_OF_MONTH]: 'Tag des Monats',
    [TranslatorTranslationFieldKey.DAY_OF_YEAR]: 'Tag des Jahres',
    [TranslatorTranslationFieldKey.VALUE_IS_REGEX]: 'Ist der Wert ein Regex-Muster?',
};
